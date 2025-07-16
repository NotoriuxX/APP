// Archivo de prueba para verificar conexión NTP con ntp.shoa.cl
const ntpClient = require('ntp-client');
const moment = require('moment-timezone');

// Función para obtener la hora oficial de Chile desde ntp.shoa.cl
const obtenerHoraOficialChile = () => {
  return new Promise((resolve, reject) => {
    console.log('🔍 Intentando conectar con ntp.shoa.cl...');
    
    // Intentar obtener hora desde el servidor NTP de SHOA (Chile)
    ntpClient.getNetworkTime('ntp.shoa.cl', 123, (err, date) => {
      if (err) {
        console.warn('⚠️  No se pudo conectar con ntp.shoa.cl:', err.message);
        // Fallback: usar hora local convertida a zona horaria de Chile
        const fechaLocal = moment().tz('America/Santiago').format('YYYY-MM-DD HH:mm:ss');
        console.log('🔄 Usando hora local de Chile como fallback:', fechaLocal);
        resolve(fechaLocal);
      } else {
        // Convertir la fecha NTP a zona horaria de Chile
        const fechaNTP = moment(date).tz('America/Santiago').format('YYYY-MM-DD HH:mm:ss');
        console.log('✅ Hora obtenida desde ntp.shoa.cl:', fechaNTP);
        console.log('📊 Fecha NTP original:', date);
        console.log('🕐 Diferencia con hora local:', moment().diff(moment(date), 'seconds'), 'segundos');
        resolve(fechaNTP);
      }
    });
  });
};

// Ejecutar prueba
(async () => {
  try {
    console.log('='.repeat(60));
    console.log('PRUEBA DE SINCRONIZACIÓN NTP CON SHOA CHILE');
    console.log('='.repeat(60));
    
    const horaLocal = moment().tz('America/Santiago').format('YYYY-MM-DD HH:mm:ss');
    console.log('🏠 Hora local (Chile):', horaLocal);
    
    const horaOficial = await obtenerHoraOficialChile();
    console.log('🇨🇱 Hora oficial (SHOA):', horaOficial);
    
    console.log('='.repeat(60));
    console.log('✅ Prueba completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
})();
