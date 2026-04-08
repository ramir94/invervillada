import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const USER_ID = '986d6514-71c6-4241-b9cb-62db314e7e33'

// ISINs conocidos de ETFs de renta fija → ticker corto en la app
const BOND_ETF_ISINS: Record<string, { ticker: string; name: string }> = {
  'US4642874329': { ticker: 'TLT', name: 'ETF ISHARES BARCLAYS 20 YEARS TR' },
  'US4642886794': { ticker: 'SHV', name: 'ETF ISHARES BARC SHORT TREASURY BD' },
  'IE00BCRY6557': { ticker: 'ERNE', name: 'ISHARES EUR ULTRASHORT BOND ETF' },
  'IE00B3FH7618': { ticker: 'IEAC', name: 'ISHARES CORE EUR CORP BOND ETF' },
  'IE00BZ163K21': { ticker: 'VGOV', name: 'VANGUARD UK GILT ETF' },
}

interface ParsedOperation {
  bloomberg_ticker: string
  name: string
  isin: string
  currency: string
  instrument: string
  side: string
  quantity: number
  price: number
}

/**
 * Parsea el cuerpo de un email de Abante con formato de tabla:
 * IIC | Nombre IIC | Ticker | Nombre | ISIN | Divisa | Instrumento | B/S | Q | Precio
 * Los campos están separados por dobles saltos de línea.
 */
function parseAbanteEmail(body: string): ParsedOperation[] {
  // Normalizar saltos de línea y dividir por celdas
  const cells = body
    .split(/\r?\n\r?\n/)
    .map(c => c.trim())
    .filter(c => c.length > 0)

  // Buscar inicio de la tabla (cabecera "IIC")
  const headerStart = cells.findIndex(c => c === 'IIC')
  if (headerStart === -1) throw new Error('No se encontró la tabla de operaciones en el email')

  // Saltar las 10 celdas de cabecera
  const dataCells = cells.slice(headerStart + 10)

  const operations: ParsedOperation[] = []
  for (let i = 0; i + 9 < dataCells.length; i += 10) {
    const chunk = dataCells.slice(i, i + 10)
    const [_iic, _nombreIic, ticker, nombre, isin, divisa, instrumento, bs, q, precio] = chunk

    // Parar si llegamos a datos que no son tabla (firma del email, etc.)
    if (!bs || !['B', 'S'].includes(bs.trim())) break

    operations.push({
      bloomberg_ticker: ticker,
      name: nombre,
      isin: isin,
      currency: divisa,
      instrument: instrumento,
      side: bs.trim(),
      quantity: parseInt(q.replace(/\./g, ''), 10),
      // Formato europeo: "100,76" → 100.76 | "1.000,50" → 1000.50
      price: parseFloat(precio.replace(/\./g, '').replace(',', '.')),
    })
  }
  return operations
}

/**
 * Convierte una operación parseada al formato de la tabla operations de Supabase.
 */
function mapToOperation(
  parsed: ParsedOperation,
  existingOps: Array<{ ticker: string; asset_type: string; sector: string; company_name: string }>,
  operationDate: string,
) {
  const isBond = parsed.instrument === 'Bono'
  const isBondEtf = !isBond && BOND_ETF_ISINS[parsed.isin]

  let ticker: string
  let assetType: string
  let companyName = parsed.name
  let sector = ''

  if (isBond) {
    ticker = parsed.isin
    assetType = 'bond'
    sector = 'Fixed Income'
  } else if (isBondEtf) {
    ticker = BOND_ETF_ISINS[parsed.isin].ticker
    companyName = BOND_ETF_ISINS[parsed.isin].name
    assetType = 'bond_etf'
    sector = 'Fixed Income'
  } else {
    // Extraer ticker corto del formato Bloomberg: "SHEL LN Equity" → "SHEL"
    ticker = parsed.bloomberg_ticker.split(' ')[0]
    assetType = 'equity'
  }

  // Si el ticker ya existe en la DB, heredar asset_type y sector
  const existing = existingOps.find(op => op.ticker === ticker)
  if (existing) {
    assetType = existing.asset_type || assetType
    sector = existing.sector || sector
    if (!companyName || companyName === parsed.isin) {
      companyName = existing.company_name
    }
  }

  // Para bonos, Q del email es en miles (convención Bloomberg)
  const shares = isBond ? parsed.quantity * 1000 : parsed.quantity

  return {
    ticker,
    company_name: companyName,
    sector,
    type: parsed.side === 'B' ? 'buy' : 'sell',
    shares,
    price: parsed.price,
    currency: parsed.currency,
    asset_type: assetType,
    isin: (isBond || isBondEtf) ? parsed.isin : null,
    maturity_date: null,
    coupon_rate: null,
    rating: null,
    duration: null,
    ytm_at_purchase: null,
    date: operationDate,
    user_id: USER_ID,
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  try {
    const { email_body, email_date, gmail_message_id, subject, secret } = await req.json()

    // Verificar secreto del webhook
    const expectedSecret = Deno.env.get('WEBHOOK_SECRET')
    if (!expectedSecret || secret !== expectedSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    if (!email_body) {
      return new Response(JSON.stringify({ error: 'email_body required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Comprobar si ya se procesó este email
    if (gmail_message_id) {
      const { data: alreadyProcessed } = await supabase
        .from('processed_emails')
        .select('id')
        .eq('gmail_message_id', gmail_message_id)
        .maybeSingle()

      if (alreadyProcessed) {
        return new Response(JSON.stringify({
          status: 'already_processed',
          gmail_message_id,
        }), { headers: { ...CORS, 'Content-Type': 'application/json' } })
      }
    }

    // Parsear operaciones del email
    const parsed = parseAbanteEmail(email_body)
    if (parsed.length === 0) {
      return new Response(JSON.stringify({ error: 'No se encontraron operaciones en el email' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Obtener operaciones existentes para mapeo de tickers
    const { data: existingOps } = await supabase
      .from('operations')
      .select('ticker, asset_type, sector, company_name')

    // Calcular fecha de operación desde el email
    const operationDate = email_date
      ? new Date(email_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]

    // Mapear a formato de la tabla operations
    const operations = parsed.map(p => mapToOperation(p, existingOps || [], operationDate))

    // Insertar operaciones
    const { data: inserted, error: insertError } = await supabase
      .from('operations')
      .insert(operations)
      .select()

    if (insertError) throw insertError

    // Registrar email como procesado
    if (gmail_message_id) {
      await supabase.from('processed_emails').insert({
        gmail_message_id,
        subject: subject || null,
        email_date: email_date ? new Date(email_date).toISOString() : null,
        operations_created: inserted?.length || 0,
      })
    }

    return new Response(JSON.stringify({
      status: 'ok',
      operations_created: inserted?.length || 0,
      operations: inserted?.map(op => ({
        ticker: op.ticker,
        type: op.type,
        shares: op.shares,
        price: op.price,
        currency: op.currency,
        asset_type: op.asset_type,
      })),
    }), { headers: { ...CORS, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('process-email-operations error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
