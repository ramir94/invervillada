/**
 * Google Apps Script — Buzón automático Invervillada
 *
 * Vigila la etiqueta INVERVILLADA en Gmail y envía los emails de operaciones
 * de Abante al Edge Function de Supabase para procesarlos automáticamente.
 *
 * INSTALACIÓN:
 * 1. Ir a https://script.google.com → Nuevo proyecto
 * 2. Pegar este código
 * 3. Configurar las constantes SUPABASE_URL y WEBHOOK_SECRET abajo
 * 4. Ejecutar setupTrigger() una vez (menú Ejecutar → setupTrigger)
 * 5. Autorizar permisos de Gmail cuando lo pida
 *
 * A partir de ahí, cada 5 minutos revisará emails nuevos con la etiqueta
 * INVERVILLADA que contengan "Operaciones" en el asunto.
 */

// ─── CONFIGURACIÓN ───────────────────────────────────────────────
const SUPABASE_URL = 'https://dzmuvbqvyntjrslahscy.supabase.co'
const EDGE_FUNCTION = 'process-email-operations'
const WEBHOOK_SECRET = 'CAMBIAR_POR_TU_SECRETO'  // Mismo valor que en Supabase
const GMAIL_LABEL = 'INVERVILLADA'
const PROCESSED_LABEL = 'INVERVILLADA/Procesado'  // Se crea automáticamente
// ─────────────────────────────────────────────────────────────────

/**
 * Configura el trigger para ejecutarse cada 5 minutos.
 * Ejecutar una sola vez manualmente.
 */
function setupTrigger() {
  // Eliminar triggers anteriores de esta función
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'processNewEmails') ScriptApp.deleteTrigger(t)
  })
  // Crear nuevo trigger cada 5 minutos
  ScriptApp.newTrigger('processNewEmails')
    .timeBased()
    .everyMinutes(5)
    .create()
  Logger.log('Trigger configurado: processNewEmails cada 5 minutos')

  // Crear etiqueta "Procesado" si no existe
  getOrCreateLabel(PROCESSED_LABEL)
  Logger.log('Etiqueta ' + PROCESSED_LABEL + ' lista')
}

function getOrCreateLabel(name) {
  let label = GmailApp.getUserLabelByName(name)
  if (!label) label = GmailApp.createLabel(name)
  return label
}

/**
 * Función principal: busca emails de operaciones sin procesar y los envía a Supabase.
 */
function processNewEmails() {
  const sourceLabel = GmailApp.getUserLabelByName(GMAIL_LABEL)
  if (!sourceLabel) {
    Logger.log('No se encontró la etiqueta ' + GMAIL_LABEL)
    return
  }
  const processedLabel = getOrCreateLabel(PROCESSED_LABEL)

  // Buscar threads con etiqueta INVERVILLADA que no tengan etiqueta Procesado
  // y cuyo asunto contenga "Operaciones"
  const threads = sourceLabel.getThreads(0, 20)

  let processed = 0
  for (const thread of threads) {
    // Saltar si ya tiene etiqueta Procesado
    const labels = thread.getLabels().map(l => l.getName())
    if (labels.includes(PROCESSED_LABEL)) continue

    const subject = thread.getFirstMessageSubject() || ''
    // Solo procesar emails de operaciones de Abante
    if (!subject.toLowerCase().includes('operaciones')) continue

    const messages = thread.getMessages()
    for (const message of messages) {
      const messageId = message.getId()
      const body = message.getPlainBody()
      const date = message.getDate()

      // Verificar que contiene la tabla de operaciones (tiene "IIC" y "B/S")
      if (!body || !body.includes('IIC') || !body.includes('B/S')) continue

      try {
        const result = callEdgeFunction(body, date, messageId, subject)
        Logger.log('Email ' + messageId + ': ' + JSON.stringify(result))
        processed++
      } catch (e) {
        Logger.log('Error procesando email ' + messageId + ': ' + e.message)
      }
    }

    // Marcar thread como procesado
    thread.addLabel(processedLabel)
  }

  if (processed > 0) {
    Logger.log('Procesados ' + processed + ' emails de operaciones')
  }
}

/**
 * Llama al Edge Function de Supabase con el cuerpo del email.
 */
function callEdgeFunction(emailBody, emailDate, gmailMessageId, subject) {
  const url = SUPABASE_URL + '/functions/v1/' + EDGE_FUNCTION

  const payload = {
    email_body: emailBody,
    email_date: emailDate.toISOString(),
    gmail_message_id: gmailMessageId,
    subject: subject,
    secret: WEBHOOK_SECRET,
  }

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  }

  const response = UrlFetchApp.fetch(url, options)
  const code = response.getResponseCode()
  const text = response.getContentText()

  if (code !== 200) {
    throw new Error('HTTP ' + code + ': ' + text)
  }

  return JSON.parse(text)
}

/**
 * Función de test: procesa manualmente el último email de INVERVILLADA.
 * Útil para probar sin esperar al trigger.
 */
function testProcessLatest() {
  processNewEmails()
}
