const calcularHojasNecesarias = (cantidad, multiplicador, dobleHoja) => {
  if (!dobleHoja) {
    return cantidad * multiplicador;
  }
  const hojasPorGrupo = Math.ceil(cantidad / 2);
  return hojasPorGrupo * multiplicador;
};

console.log('=== PRUEBAS DE CÁLCULO DE HOJAS ===');
console.log('Caso 1: 9 copias x1 doble cara =', calcularHojasNecesarias(9, 1, true), 'hojas (esperado: 5)');
console.log('Caso 2: 9 copias x10 doble cara =', calcularHojasNecesarias(9, 10, true), 'hojas (esperado: 50)');
console.log('Caso 3: 8 copias x1 doble cara =', calcularHojasNecesarias(8, 1, true), 'hojas (esperado: 4)');
console.log('Caso 4: 8 copias x10 doble cara =', calcularHojasNecesarias(8, 10, true), 'hojas (esperado: 40)');
console.log('Caso 5: 10 copias x1 simple =', calcularHojasNecesarias(10, 1, false), 'hojas (esperado: 10)');

console.log('\n=== CASOS ADICIONALES ===');
console.log('1 copia x1 doble cara =', calcularHojasNecesarias(1, 1, true), 'hojas (esperado: 1)');
console.log('2 copias x1 doble cara =', calcularHojasNecesarias(2, 1, true), 'hojas (esperado: 1)');
console.log('3 copias x1 doble cara =', calcularHojasNecesarias(3, 1, true), 'hojas (esperado: 2)');
console.log('4 copias x1 doble cara =', calcularHojasNecesarias(4, 1, true), 'hojas (esperado: 2)');
