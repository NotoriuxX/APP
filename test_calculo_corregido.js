// Función corregida
const calcularHojasNecesarias = (cantidad, multiplicador = 1, dobleHoja = false) => {
  const cantidadNum = parseInt(cantidad) || 0;
  const multiplicadorNum = parseInt(multiplicador) || 1;
  if (cantidadNum === 0) return 0;
  
  let hojasPorCopia;
  
  if (!dobleHoja) {
    hojasPorCopia = cantidadNum;
  } else {
    if (cantidadNum % 2 === 0) {
      hojasPorCopia = cantidadNum / 2;
    } else {
      hojasPorCopia = Math.floor(cantidadNum / 2) + 1;
    }
  }
  
  return hojasPorCopia * multiplicadorNum;
};

console.log('=== PRUEBAS DE CÁLCULO CORRECTO ===');
console.log('Caso del usuario: 9 páginas × 10 copias, doble cara');
const resultado = calcularHojasNecesarias(9, 10, true);
console.log('Resultado:', resultado, 'hojas');
console.log('Esperado: 50 hojas (5 hojas por copia × 10 copias)');
console.log('¿Correcto?', resultado === 50 ? '✅ SÍ' : '❌ NO');
console.log('');

console.log('Casos adicionales:');
console.log('15 páginas × 1 copia, doble cara:', calcularHojasNecesarias(15, 1, true), 'hojas (esperado: 8)');
console.log('10 páginas × 5 copias, doble cara:', calcularHojasNecesarias(10, 5, true), 'hojas (esperado: 25)');
console.log('9 páginas × 1 copia, una cara:', calcularHojasNecesarias(9, 1, false), 'hojas (esperado: 9)');
console.log('9 páginas × 10 copias, una cara:', calcularHojasNecesarias(9, 10, false), 'hojas (esperado: 90)');

console.log('\n=== VERIFICACIÓN DE LA LÓGICA ===');
console.log('Por copia individual:');
console.log('- 9 páginas doble cara → 9 ÷ 2 = 4.5 → FLOOR(4.5) + 1 = 5 hojas por copia');
console.log('- 5 hojas × 10 copias = 50 hojas totales');
