import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { useToast } from '../../../components/ToastContext';
// Imports para reportes
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Dashboard = () => {
  // Estados para la aplicación
  const [filterPeriod, setFilterPeriod] = useState('ultimos30');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [comparisonMonth, setComparisonMonth] = useState('previous'); // 'previous', 'lastYear', o fecha específica
  const [customComparisonDate, setCustomComparisonDate] = useState('');
  const [stats, setStats] = useState({
    general: {
      total_registros: 0,
      total_copias: 0,
      total_bn: 0,
      total_color: 0,
      total_doble_hoja: 0,
      total_una_hoja: 0,
      total_hojas: 0,
      usuarios_unicos: 0
    },
    porDia: [],
    porMes: [],
    porUsuario: [],
    analisis: null
  });
  const [analisisAvanzado, setAnalisisAvanzado] = useState(null);
  const [precios, setPrecios] = useState({
    precio_bn: 15,
    precio_color: 50,
    precio_hoja: 5,
    fotocopia_gracia_bn: 1,
    fotocopia_gracia_color: 1
  });
  const [actividad, setActividad] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPreciosModal, setShowPreciosModal] = useState(false);
  const [modalAnimating, setModalAnimating] = useState(false);
  const [editingPrecios, setEditingPrecios] = useState({});
  
  // Estados para el sistema de reportes
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportModalAnimating, setReportModalAnimating] = useState(false);
  const [reportOptions, setReportOptions] = useState({
    estadisticasGenerales: true,
    tendenciasDiarias: true,
    distribucionTipos: true,
    distribucionCaras: true,
    analisisEficiencia: true,
    proyecciones: true,
    actividadReciente: false,
    desgloseCostos: true
  });
  const [reportFormat, setReportFormat] = useState('pdf'); // 'pdf' o 'excel'
  const [generatingReport, setGeneratingReport] = useState(false);
  const [autoEmailEnabled, setAutoEmailEnabled] = useState(false); // Para funcionalidad futura
  
  // API URL
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3300';
  
  // Usar el hook de toast global
  const toast = useToast();
  
  // Función para mostrar toast que usa el nuevo sistema
  const showToastMessage = (message, type = 'success') => {
    toast[type](message, 4000);
  };

  // Función para obtener fechas según filtro
  const getDateRange = useCallback(() => {
    const today = new Date();
    const todayFormatted = today.toISOString().split('T')[0]; // YYYY-MM-DD
    
    switch (filterPeriod) {
      case 'hoy':
        return { desde: todayFormatted, hasta: todayFormatted };
      case 'ayer': {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const yesterdayFormatted = yesterday.toISOString().split('T')[0];
        return { desde: yesterdayFormatted, hasta: yesterdayFormatted };
      }
      case 'semana': {
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        const weekAgoFormatted = weekAgo.toISOString().split('T')[0];
        return { desde: weekAgoFormatted, hasta: todayFormatted };
      }
      case 'ultimos30': {
        const monthAgo = new Date(today);
        monthAgo.setDate(today.getDate() - 30);
        const monthAgoFormatted = monthAgo.toISOString().split('T')[0];
        return { desde: monthAgoFormatted, hasta: todayFormatted };
      }
      case 'mes': {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { 
          desde: firstDay.toISOString().split('T')[0], 
          hasta: lastDay.toISOString().split('T')[0] 
        };
      }
      case 'personalizado':
        return { desde: customDateFrom, hasta: customDateTo };
      default:
        return { desde: null, hasta: null };
    }
  }, [filterPeriod, customDateFrom, customDateTo]);

  // Función para obtener estadísticas
  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const { desde, hasta } = getDateRange();
      
      // Construir URL con parámetros de filtro
      let url = `${API_URL}/api/dashboard/impresiones/estadisticas`;
      const params = [];
      if (desde) params.push(`desde=${desde}`);
      if (hasta) params.push(`hasta=${hasta}`);
      if (params.length > 0) {
        url += '?' + params.join('&');
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
      showToastMessage('Error al cargar estadísticas', 'error');
    } finally {
      setLoading(false);
    }
  }, [API_URL, getDateRange]);

  // Función para obtener análisis avanzado
  const fetchAnalisisAvanzado = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const { desde, hasta } = getDateRange();
      
      // Construir URL con parámetros de filtro
      let url = `${API_URL}/api/dashboard/impresiones/analisis-avanzado`;
      const params = [];
      if (desde) params.push(`desde=${desde}`);
      if (hasta) params.push(`hasta=${hasta}`);
      
      // Añadir parámetros de comparación
      if (comparisonMonth === 'previous') {
        params.push(`tipoComparacion=mesAnterior`);
      } else if (comparisonMonth === 'lastYear') {
        params.push(`tipoComparacion=anioAnterior`);
      } else if (comparisonMonth === 'custom' && customComparisonDate) {
        const [year, month] = customComparisonDate.split('-');
        params.push(`mesComparacion=${month}`);
        params.push(`anioComparacion=${year}`);
      }
      if (params.length > 0) {
        url += '?' + params.join('&');
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setAnalisisAvanzado(data);
    } catch (error) {
      console.error('Error al cargar análisis avanzado:', error);
      showToastMessage('Error al cargar análisis avanzado', 'error');
    }
  }, [API_URL, getDateRange, comparisonMonth, customComparisonDate]);

  // Función para obtener configuración de precios
  const fetchPrecios = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/dashboard/impresiones/precios`, {
        method: 'GET',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setPrecios(data);
      setEditingPrecios(data);
    } catch (error) {
      console.error('Error al cargar precios:', error);
    }
  }, [API_URL]);

  // Función para obtener historial de actividad
  const fetchActividad = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/dashboard/impresiones/actividad`, {
        method: 'GET',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setActividad(data);
    } catch (error) {
      console.error('Error al cargar actividad:', error);
    }
  }, [API_URL]);

  // Función para guardar configuración de precios
  const handleSavePrecios = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/dashboard/impresiones/precios`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingPrecios)
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      setPrecios(editingPrecios);
      handleCloseModal();
      showToastMessage('Precios actualizados correctamente');
    } catch (error) {
      console.error('Error al guardar precios:', error);
      showToastMessage('Error al guardar precios', 'error');
    }
  };

  // Funciones para manejar el modal
  const handleOpenModal = () => {
    setShowPreciosModal(true);
    setModalAnimating(true);
    setTimeout(() => setModalAnimating(false), 300);
  };
  
  const handleCloseModal = () => {
    setModalAnimating(true);
    setTimeout(() => {
      setShowPreciosModal(false);
      setModalAnimating(false);
    }, 300);
  };

  // Funciones para manejar el modal de reportes
  const handleOpenReportModal = () => {
    setShowReportModal(true);
    setReportModalAnimating(true);
    setTimeout(() => setReportModalAnimating(false), 300);
  };
  
  const handleCloseReportModal = () => {
    setReportModalAnimating(true);
    setTimeout(() => {
      setShowReportModal(false);
      setReportModalAnimating(false);
    }, 300);
  };

  // Función para generar reporte en PDF
  const generatePDFReport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let yPosition = 20;

    // Configurar fuentes y colores
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    
    // Título del reporte
    doc.text('Reporte de Sistema de Fotocopias', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;
    
    // Fecha del reporte
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    const fechaReporte = new Date().toLocaleDateString('es-CL');
    const { desde, hasta } = getDateRange();
    doc.text(`Generado el: ${fechaReporte}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 5;
    doc.text(`Período: ${desde || 'N/A'} a ${hasta || 'N/A'}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Estadísticas Generales
    if (reportOptions.estadisticasGenerales) {
      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.text('Estadísticas Generales', 20, yPosition);
      yPosition += 10;

      const estadisticasData = [
        ['Total de Copias', stats.general.total_copias.toLocaleString()],
        ['Total de Hojas', (stats.general.total_hojas || stats.general.total_copias).toLocaleString()],
        ['Copias B/N', stats.general.total_bn.toLocaleString()],
        ['Copias Color', stats.general.total_color.toLocaleString()],
        ['Copias Doble Cara', (stats.general.total_doble_hoja || 0).toLocaleString()],
        ['Copias Una Cara', (stats.general.total_una_hoja || 0).toLocaleString()],
        ['Usuarios Únicos', stats.general.usuarios_unicos.toString()],
        ['Costo Estimado Total', formatCurrency(costoTotal)]
      ];

      doc.autoTable({
        startY: yPosition,
        head: [['Métrica', 'Valor']],
        body: estadisticasData,
        theme: 'striped',
        headStyles: { fillColor: [20, 184, 166] },
        margin: { left: 20, right: 20 }
      });
      yPosition = doc.lastAutoTable.finalY + 20;
    }

    // Desglose de Costos
    if (reportOptions.desgloseCostos) {
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.text('Desglose de Costos', 20, yPosition);
      yPosition += 10;

      const costosData = [
        ['Copias B/N', stats.general.total_bn.toLocaleString(), `$${precios.precio_bn}`, formatCurrency(stats.general.total_bn * precios.precio_bn)],
        ['Copias Color', stats.general.total_color.toLocaleString(), `$${precios.precio_color}`, formatCurrency(stats.general.total_color * precios.precio_color)],
        ['Costo Papel', (stats.general.total_hojas || 0).toLocaleString(), `$${precios.precio_hoja}`, formatCurrency((stats.general.total_hojas || 0) * precios.precio_hoja)],
        ['', '', 'TOTAL', formatCurrency(costoTotal)]
      ];

      doc.autoTable({
        startY: yPosition,
        head: [['Tipo', 'Cantidad', 'Precio Unitario', 'Costo Total']],
        body: costosData,
        theme: 'striped',
        headStyles: { fillColor: [20, 184, 166] },
        margin: { left: 20, right: 20 }
      });
      yPosition = doc.lastAutoTable.finalY + 20;
    }

    // Análisis de Eficiencia
    if (reportOptions.analisisEficiencia && analisisAvanzado) {
      if (yPosition > pageHeight - 100) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.text('Análisis de Eficiencia', 20, yPosition);
      yPosition += 10;

      const eficienciaData = [
        ['Ahorro Doble Cara', formatCurrency(analisisAvanzado.ahorroDobleHoja?.costo_ahorrado || 0)],
        ['Hojas Ahorradas', (analisisAvanzado.ahorroDobleHoja?.hojas_ahorradas || 0).toString()],
        ['Resmas Utilizadas', (analisisAvanzado.planificacionResmas?.resmas_utilizadas || 0).toString()],
        ['Costo Resmas', formatCurrency(analisisAvanzado.planificacionResmas?.costo_resmas || 0)],
        ['Promedio Mensual', formatCurrency(analisisAvanzado.promedios?.costo_promedio_mensual || 0)],
        ['Proyección Anual Resmas', (analisisAvanzado.planificacionResmas?.proyeccion_anual_resmas || 0).toString()],
        ['Proyección Anual Costo', formatCurrency(analisisAvanzado.planificacionResmas?.proyeccion_anual_costo || 0)]
      ];

      doc.autoTable({
        startY: yPosition,
        head: [['Métrica', 'Valor']],
        body: eficienciaData,
        theme: 'striped',
        headStyles: { fillColor: [20, 184, 166] },
        margin: { left: 20, right: 20 }
      });
      yPosition = doc.lastAutoTable.finalY + 20;
    }

    // Tendencias Diarias
    if (reportOptions.tendenciasDiarias && stats.porDia && stats.porDia.length > 0) {
      if (yPosition > pageHeight - 100) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.text('Tendencias Diarias (Últimos 10 días)', 20, yPosition);
      yPosition += 10;

      const tendenciasData = stats.porDia.slice(-10).map(day => [
        day.fecha,
        day.bn.toString(),
        day.color.toString(),
        (day.total_hojas || day.copias).toString(),
        day.copias.toString()
      ]);

      doc.autoTable({
        startY: yPosition,
        head: [['Fecha', 'B/N', 'Color', 'Hojas', 'Total Copias']],
        body: tendenciasData,
        theme: 'striped',
        headStyles: { fillColor: [20, 184, 166] },
        margin: { left: 20, right: 20 }
      });
    }

    // Pie de página
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - 30, pageHeight - 10, { align: 'right' });
      doc.text('Sistema de Gestión de Fotocopias', 20, pageHeight - 10);
    }

    // Guardar el PDF
    const nombreArchivo = `reporte-fotocopias-${fechaReporte.replace(/\//g, '-')}.pdf`;
    doc.save(nombreArchivo);
  };

  // Función para generar reporte en Excel
  const generateExcelReport = () => {
    const workbook = XLSX.utils.book_new();
    
    // Hoja 1: Estadísticas Generales
    if (reportOptions.estadisticasGenerales) {
      const estadisticasData = [
        ['Reporte de Sistema de Fotocopias'],
        ['Generado el:', new Date().toLocaleDateString('es-CL')],
        ['Período:', `${getDateRange().desde || 'N/A'} a ${getDateRange().hasta || 'N/A'}`],
        [''],
        ['Estadísticas Generales'],
        ['Total de Copias', stats.general.total_copias],
        ['Total de Hojas', stats.general.total_hojas || stats.general.total_copias],
        ['Copias B/N', stats.general.total_bn],
        ['Copias Color', stats.general.total_color],
        ['Copias Doble Cara', stats.general.total_doble_hoja || 0],
        ['Copias Una Cara', stats.general.total_una_hoja || 0],
        ['Usuarios Únicos', stats.general.usuarios_unicos],
        ['Costo Estimado Total', costoTotal]
      ];

      const wsEstadisticas = XLSX.utils.aoa_to_sheet(estadisticasData);
      XLSX.utils.book_append_sheet(workbook, wsEstadisticas, 'Estadísticas');
    }

    // Hoja 2: Desglose de Costos
    if (reportOptions.desgloseCostos) {
      const costosData = [
        ['Desglose de Costos'],
        [''],
        ['Tipo', 'Cantidad', 'Precio Unitario', 'Costo Total'],
        ['Copias B/N', stats.general.total_bn, precios.precio_bn, stats.general.total_bn * precios.precio_bn],
        ['Copias Color', stats.general.total_color, precios.precio_color, stats.general.total_color * precios.precio_color],
        ['Costo Papel', stats.general.total_hojas || 0, precios.precio_hoja, (stats.general.total_hojas || 0) * precios.precio_hoja],
        [''],
        ['TOTAL', '', '', costoTotal]
      ];

      const wsCostos = XLSX.utils.aoa_to_sheet(costosData);
      XLSX.utils.book_append_sheet(workbook, wsCostos, 'Costos');
    }

    // Hoja 3: Tendencias Diarias
    if (reportOptions.tendenciasDiarias && stats.porDia && stats.porDia.length > 0) {
      const tendenciasData = [
        ['Tendencias Diarias'],
        [''],
        ['Fecha', 'B/N', 'Color', 'Hojas', 'Total Copias'],
        ...stats.porDia.map(day => [
          day.fecha,
          day.bn,
          day.color,
          day.total_hojas || day.copias,
          day.copias
        ])
      ];

      const wsTendencias = XLSX.utils.aoa_to_sheet(tendenciasData);
      XLSX.utils.book_append_sheet(workbook, wsTendencias, 'Tendencias');
    }

    // Hoja 4: Análisis de Eficiencia
    if (reportOptions.analisisEficiencia && analisisAvanzado) {
      const eficienciaData = [
        ['Análisis de Eficiencia'],
        [''],
        ['Métrica', 'Valor'],
        ['Ahorro Doble Cara', analisisAvanzado.ahorroDobleHoja?.costo_ahorrado || 0],
        ['Hojas Ahorradas', analisisAvanzado.ahorroDobleHoja?.hojas_ahorradas || 0],
        ['Resmas Utilizadas', analisisAvanzado.planificacionResmas?.resmas_utilizadas || 0],
        ['Costo Resmas', analisisAvanzado.planificacionResmas?.costo_resmas || 0],
        ['Promedio Mensual', analisisAvanzado.promedios?.costo_promedio_mensual || 0],
        ['Proyección Anual Resmas', analisisAvanzado.planificacionResmas?.proyeccion_anual_resmas || 0],
        ['Proyección Anual Costo', analisisAvanzado.planificacionResmas?.proyeccion_anual_costo || 0]
      ];

      const wsEficiencia = XLSX.utils.aoa_to_sheet(eficienciaData);
      XLSX.utils.book_append_sheet(workbook, wsEficiencia, 'Eficiencia');
    }

    // Guardar el archivo Excel
    const fechaReporte = new Date().toLocaleDateString('es-CL').replace(/\//g, '-');
    const nombreArchivo = `reporte-fotocopias-${fechaReporte}.xlsx`;
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, nombreArchivo);
  };

  // Función principal para generar reportes
  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    
    try {
      if (reportFormat === 'pdf') {
        generatePDFReport();
      } else {
        generateExcelReport();
      }
      
      showToastMessage('Reporte generado exitosamente', 'success');
      handleCloseReportModal();
    } catch (error) {
      console.error('Error al generar reporte:', error);
      showToastMessage('Error al generar el reporte', 'error');
    } finally {
      setGeneratingReport(false);
    }
  };

  // Calcular costos totales
  const costoTotal = useMemo(() => {
    // Calcular costos considerando copias de gracia
    const copiasBN = Math.max(0, stats.general.total_bn - precios.fotocopia_gracia_bn);
    const copiasColor = Math.max(0, stats.general.total_color - precios.fotocopia_gracia_color);
    
    // Costo por copias
    const costoBN = copiasBN * precios.precio_bn;
    const costoColor = copiasColor * precios.precio_color;
    
    // Costo por hojas
    const costoHojas = stats.general.total_hojas * precios.precio_hoja;
    
    // Costo total
    return costoBN + costoColor + costoHojas;
  }, [stats, precios]);

  // Preparar datos para tablas (mantener para compatibilidad)
  const datosActividad = useMemo(() => {
    if (!stats.porDia || stats.porDia.length === 0) {
      return [];
    }
    
    return stats.porDia.map(day => ({
      fecha: new Date(day.fecha).toLocaleDateString('es-CL'),
      bn: day.bn,
      color: day.color,
      total: day.copias
    }));
  }, [stats.porDia]);
  
  // Datos para gráficos
  const chartDataActividad = useMemo(() => {
    if (!stats.porDia || stats.porDia.length === 0) {
      return { labels: [], datasets: [] };
    }
    
    return {
      labels: stats.porDia.map(day => {
        // La fecha ya viene formateada como dd-mm desde el backend
        // Simplemente reemplazamos el guion por una barra
        return day.fecha.replace('-', '/'); // Convertir dd-mm a dd/mm
      }),
      datasets: [
        {
          label: 'B/N',
          data: stats.porDia.map(day => day.bn),
          backgroundColor: 'rgba(75, 85, 99, 0.2)',
          borderColor: 'rgb(75, 85, 99)',
          borderWidth: 2,
          pointBackgroundColor: 'rgb(75, 85, 99)',
          tension: 0.2
        },
        {
          label: 'Color',
          data: stats.porDia.map(day => day.color),
          backgroundColor: 'rgba(20, 184, 166, 0.2)',
          borderColor: 'rgb(20, 184, 166)',
          borderWidth: 2,
          pointBackgroundColor: 'rgb(20, 184, 166)',
          tension: 0.2
        },
        {
          label: 'Hojas',
          data: stats.porDia.map(day => day.total_hojas),
          backgroundColor: 'rgba(16, 185, 129, 0.1)', // Verde claro
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 1,
          pointBackgroundColor: 'rgb(16, 185, 129)',
          tension: 0.2,
          borderDash: [5, 5],
          fill: false
        }
      ]
    };
  }, [stats.porDia]);

  const chartOptionsTendencia = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: {
        display: true,
        text: 'Tendencia de Uso de Fotocopias',
        font: { size: 16 }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y || 0;
            if (label === 'Hojas') {
              return `${label}: ${value} hojas`;
            }
            return `${label}: ${value} copias`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Cantidad de Copias'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Fecha'
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  };

  const datosDistribucion = useMemo(() => {
    const totalCopias = stats.general.total_bn + stats.general.total_color;
    const porcentajeBN = totalCopias > 0 ? Math.round((stats.general.total_bn / totalCopias) * 100) : 0;
    const porcentajeColor = totalCopias > 0 ? Math.round((stats.general.total_color / totalCopias) * 100) : 0;
    
    return [
      { tipo: 'B/N', cantidad: stats.general.total_bn, porcentaje: porcentajeBN },
      { tipo: 'Color', cantidad: stats.general.total_color, porcentaje: porcentajeColor }
    ];
  }, [stats.general]);
  
  const chartDataDistribucion = useMemo(() => {
    return {
      labels: ['B/N', 'Color'],
      datasets: [
        {
          data: [stats.general.total_bn, stats.general.total_color],
          backgroundColor: [
            'rgb(75, 85, 99)',
            'rgb(20, 184, 166)'
          ],
          borderColor: [
            'rgb(75, 85, 99)',
            'rgb(20, 184, 166)'
          ],
          borderWidth: 1,
          hoverOffset: 10
        }
      ]
    };
  }, [stats.general]);

  const chartOptionsDistribucion = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: {
        display: true,
        text: 'Distribución por Tipo',
        font: { size: 16 }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  // Cargar datos al iniciar y cuando cambian filtros
  useEffect(() => {
    fetchStats();
    fetchAnalisisAvanzado();
  }, [fetchStats, fetchAnalisisAvanzado]);

  useEffect(() => {
    fetchPrecios();
    fetchActividad();
  }, [fetchPrecios, fetchActividad]);

  // Formatear moneda chilena
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CL', { 
      style: 'currency', 
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Formatear fecha y hora
  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    
    // Formatear como DD/MM/YYYY HH:mm:ss
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  // Obtener ícono para el tipo de acción
  const getActionIcon = (action) => {
    switch (action) {
      case 'CREAR':
        return '➕';
      case 'ACTUALIZAR':
        return '✏️';
      case 'ELIMINAR':
        return '🗑️';
      default:
        return '📝';
    }
  };

  return (
    <div className="px-6 py-8 bg-gray-50 min-h-screen">
      {/* Cabecera con título y filtros */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard de Impresiones</h1>
          <p className="text-gray-600">Monitoreo y estadísticas del sistema de fotocopias</p>
        </div>
        
        {/* Filtros de período */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm">
            <select 
              value={filterPeriod} 
              onChange={e => setFilterPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="hoy">Hoy</option>
              <option value="ayer">Ayer</option>
              <option value="semana">Últimos 7 días</option>
              <option value="ultimos30">Últimos 30 días</option>
              <option value="mes">Mes actual</option>
              <option value="personalizado">Personalizado</option>
            </select>
            
            {filterPeriod === 'personalizado' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={e => setCustomDateFrom(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
                <span className="text-gray-500">a</span>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={e => setCustomDateTo(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
                <button
                  onClick={fetchStats}
                  className="px-3 py-1 bg-teal-600 text-white rounded-md text-sm hover:bg-teal-700 transition"
                >
                  Aplicar
                </button>
              </div>
            )}
          </div>
          
          {/* Botón de Generar Reporte */}
          <button
            onClick={handleOpenReportModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-lg shadow-sm hover:from-teal-700 hover:to-teal-800 transition-all transform hover:scale-105"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Generar Reporte
          </button>
        </div>
      </div>

      {/* Tarjetas de estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6 flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Total de Copias</p>
            <p className="text-2xl font-bold mt-1">{stats.general.total_copias.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.general.total_registros} registros
            </p>
          </div>
          <div className="p-3 rounded-full bg-gray-100 text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Total de Hojas</p>
            <p className="text-2xl font-bold mt-1">{stats.general.total_hojas?.toLocaleString() || stats.general.total_copias.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.general.total_doble_hoja?.toLocaleString() || 0} a doble cara
            </p>
          </div>
          <div className="p-3 rounded-full bg-green-100 text-green-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Copias B/N</p>
            <p className="text-2xl font-bold mt-1">{stats.general.total_bn.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.general.total_copias > 0 
                ? Math.round((stats.general.total_bn / stats.general.total_copias) * 100) 
                : 0}% del total
            </p>
          </div>
          <div className="p-3 rounded-full bg-gray-100 text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Copias Color</p>
            <p className="text-2xl font-bold mt-1">{stats.general.total_color.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.general.total_copias > 0 
                ? Math.round((stats.general.total_color / stats.general.total_copias) * 100) 
                : 0}% del total
            </p>
          </div>
          <div className="p-3 rounded-full bg-gray-100 text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Costo Estimado</p>
            <p className="text-2xl font-bold mt-1 text-teal-600">{formatCurrency(costoTotal)}</p>
            <div className="flex mt-1 cursor-pointer" onClick={handleOpenModal}>
              <p className="text-xs text-teal-600 hover:underline">
                Configurar Precios
              </p>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1 text-teal-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
          </div>
          <div className="p-3 rounded-full bg-teal-100 text-teal-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Sección de desglose de gastos */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Desglose de Gastos</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Copias B/N */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gray-100">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">Copias B/N</h3>
                <div className="mt-2">
                  <div className="flex items-baseline">
                    <p className="text-2xl font-semibold text-gray-900">
                      {stats?.general?.total_bn || 0}
                    </p>
                    <p className="ml-2 text-sm text-gray-500">copias</p>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Costo: ${((stats?.general?.total_bn || 0) * (precios?.precio_bn || 0)).toLocaleString('es-CL')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Copias Color */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">Copias Color</h3>
                <div className="mt-2">
                  <div className="flex items-baseline">
                    <p className="text-2xl font-semibold text-gray-900">
                      {stats?.general?.total_color || 0}
                    </p>
                    <p className="ml-2 text-sm text-gray-500">copias</p>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Costo: ${((stats?.general?.total_color || 0) * (precios?.precio_color || 0)).toLocaleString('es-CL')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Costo de Papel */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">Costo Papel</h3>
                <div className="mt-2">
                  <div className="flex items-baseline">
                    <p className="text-2xl font-semibold text-gray-900">
                      {stats?.general?.total_hojas || 0}
                    </p>
                    <p className="ml-2 text-sm text-gray-500">hojas</p>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Costo: ${((stats?.general?.total_hojas || 0) * (precios?.precio_hoja || 0)).toLocaleString('es-CL')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      

      {/* Gráficos de estadísticas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Gráfico de tendencia por día */}
        <div className="bg-white p-6 rounded-lg shadow-md lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Tendencia de Uso de Fotocopias</h3>
          <div className="h-80">
            {stats.porDia && stats.porDia.length > 0 ? (
              <Line 
                data={chartDataActividad} 
                options={chartOptionsTendencia}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                No hay datos disponibles
              </div>
            )}
          </div>
        </div>
        
        {/* Gráficos de distribución */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Distribución por Tipo</h3>
            <div className="h-48 flex items-center justify-center">
              {stats.general.total_copias > 0 ? (
                <Doughnut 
                  data={chartDataDistribucion} 
                  options={chartOptionsDistribucion}
                />
              ) : (
                <div className="text-gray-500">No hay datos disponibles</div>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-center">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">B/N</p>
                <p className="text-xl font-semibold">{stats.general.total_bn}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">Color</p>
                <p className="text-xl font-semibold">{stats.general.total_color}</p>
              </div>
            </div>
          </div>
          
          {/* Gráfico de distribución por caras */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Distribución por Caras</h3>
            <div className="h-48 flex items-center justify-center">
              {stats.general.total_copias > 0 ? (
                <Doughnut 
                  data={{
                    labels: ['Una Cara', 'Doble Cara'],
                    datasets: [{
                      data: [stats.general.total_una_hoja, stats.general.total_doble_hoja],
                      backgroundColor: ['rgb(99, 102, 241)', 'rgb(139, 92, 246)'],
                      borderColor: ['rgb(99, 102, 241)', 'rgb(139, 92, 246)'],
                      borderWidth: 1,
                      hoverOffset: 10
                    }]
                  }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { position: 'top' },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                          }
                        }
                      }
                    }
                  }}
                />
              ) : (
                <div className="text-gray-500">No hay datos disponibles</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actividad reciente */}
      <div className="mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md overflow-hidden">
          <h3 className="text-lg font-semibold mb-4 flex justify-between items-center">
            <span>Actividad Reciente</span>
            <span className="text-xs font-normal text-gray-500">
              {actividad.length} registros
            </span>
          </h3>
          
          <div className="max-h-80 overflow-y-auto pr-2">
            <div className="space-y-4">
              {actividad.map(item => (
                <div key={item.id} className="flex gap-3 pb-3 border-b border-gray-100">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700">
                    {getActionIcon(item.accion)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.descripcion}
                    </p>
                    <div className="flex justify-between mt-1">
                      <p className="text-xs text-gray-500">
                        {item.usuario_nombre}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDateTime(item.fecha)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {actividad.length === 0 && (
                <p className="text-center text-gray-500 py-4">
                  No hay registros de actividad reciente
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Análisis de Eficiencia y Planificación - Reorganizado */}
      {analisisAvanzado && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Análisis de Eficiencia y Planificación</h2>
            <div className="flex gap-4 items-center">
              <select
                className="form-select rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                value={comparisonMonth}
                onChange={(e) => {
                  setComparisonMonth(e.target.value);
                  fetchAnalisisAvanzado();
                }}
              >
                <option value="previous">Mes Anterior</option>
                <option value="lastYear">Mismo mes año anterior</option>
                <option value="custom">Mes específico</option>
              </select>
              {comparisonMonth === 'custom' && (
                <input
                  type="month"
                  className="form-input rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                  value={customComparisonDate}
                  onChange={(e) => {
                    setCustomComparisonDate(e.target.value);
                    fetchAnalisisAvanzado();
                  }}
                  max={new Date().toISOString().slice(0, 7)}
                />
              )}
            </div>
          </div>
          
          {/* Métricas principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Ahorro por Doble Cara */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">Ahorro Doble Cara</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(analisisAvanzado.ahorroDobleHoja?.costo_ahorrado || 0)}
                  </p>
                  <p className="text-xs text-green-600">
                    {analisisAvanzado.ahorroDobleHoja?.hojas_ahorradas || 0} hojas ahorradas
                  </p>
                </div>
                <div className="text-2xl">🌱</div>
              </div>
            </div>

            {/* Resmas Utilizadas */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-800">Resmas Utilizadas</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {analisisAvanzado.planificacionResmas?.resmas_utilizadas || 0}
                  </p>
                  <p className="text-xs text-purple-600">
                    {formatCurrency(analisisAvanzado.planificacionResmas?.costo_resmas || 0)}
                  </p>
                </div>
                <div className="text-2xl">📦</div>
              </div>
            </div>

            {/* Promedio Mensual */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">Promedio Mensual</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(analisisAvanzado.promedios?.costo_promedio_mensual || 0)}
                  </p>
                  <p className="text-xs text-blue-600">
                    {analisisAvanzado.promedios?.hojas_por_mes || 0} hojas/mes
                  </p>
                </div>
                <div className="text-2xl">📊</div>
              </div>
            </div>

            {/* Proyección Anual */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-800">Proyección Anual</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {analisisAvanzado.planificacionResmas?.proyeccion_anual_resmas || 0}
                  </p>
                  <p className="text-xs text-orange-600">
                    resmas • {formatCurrency(analisisAvanzado.planificacionResmas?.proyeccion_anual_costo || 0)}
                  </p>
                </div>
                <div className="text-2xl">📈</div>
              </div>
            </div>
          </div>

          {/* Proyecciones y Recomendaciones */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Proyección Mensual */}
            <div className="bg-white p-4 rounded-lg shadow border">
              <h4 className="font-semibold text-gray-800 mb-3">Proyección Mensual</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Resmas necesarias:</span>
                  <span className="font-medium">{analisisAvanzado.promedios?.resmas_promedio_mensual || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Costo estimado:</span>
                  <span className="font-medium">{formatCurrency(analisisAvanzado.promedios?.costo_promedio_mensual || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Hojas promedio:</span>
                  <span className="font-medium">{analisisAvanzado.promedios?.hojas_por_mes || 0}</span>
                </div>
              </div>
            </div>

            {/* Proyección Anual */}
            <div className="bg-white p-4 rounded-lg shadow border">
              <h4 className="font-semibold text-gray-800 mb-3">Proyección Anual</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Resmas anuales:</span>
                  <span className="font-medium">{analisisAvanzado.planificacionResmas?.proyeccion_anual_resmas || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Costo anual:</span>
                  <span className="font-medium">{formatCurrency(analisisAvanzado.planificacionResmas?.proyeccion_anual_costo || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ahorro potencial:</span>
                  <span className="font-medium text-green-600">{formatCurrency(analisisAvanzado.ahorroDobleHoja?.ahorro_potencial_anual || 0)}</span>
                </div>
              </div>
            </div>

            {/* Recomendaciones - Solo si hay datos suficientes */}
            {analisisAvanzado.recomendaciones && (analisisAvanzado.promedios?.hojas_por_mes || 0) > 100 && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-3">Recomendaciones</h4>
                <div className="space-y-2">
                  {analisisAvanzado.recomendaciones.incrementar_doble_cara && (
                    <div className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mt-1.5"></div>
                      <p className="text-xs text-gray-700">Incrementar uso de doble cara</p>
                    </div>
                  )}
                  {analisisAvanzado.recomendaciones.stock_recomendado > 0 && (
                    <div className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                      <p className="text-xs text-gray-700">Stock: {analisisAvanzado.recomendaciones.stock_recomendado} resmas/mes</p>
                    </div>
                  )}
                  {analisisAvanzado.picoOperativo && (
                    <div className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5"></div>
                      <p className="text-xs text-gray-700">Pico: {analisisAvanzado.picoOperativo.mes} ({analisisAvanzado.picoOperativo.resmas} resmas)</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tendencias Mensuales integradas */}
          {analisisAvanzado.tendenciasMensuales && analisisAvanzado.tendenciasMensuales.length > 1 && (
            <div className="mt-6 bg-white p-4 rounded-lg shadow border">
              <h4 className="font-semibold text-gray-800 mb-3">Tendencia de Consumo Mensual</h4>
              <div className="h-64">
                <Line 
                  data={{
                    labels: analisisAvanzado.tendenciasMensuales.map(mes => {
                      // Convertir formato YYYY-MM a MM/YYYY
                      const [year, month] = mes.mes.split('-');
                      return `${month}/${year}`;
                    }),
                    datasets: [
                      {
                        label: 'Hojas',
                        data: analisisAvanzado.tendenciasMensuales.map(mes => mes.hojas),
                        borderColor: 'rgb(20, 184, 166)',
                        backgroundColor: 'rgba(20, 184, 166, 0.1)',
                        tension: 0.2,
                        yAxisID: 'y'
                      },
                      {
                        label: 'Costo (CLP)',
                        data: analisisAvanzado.tendenciasMensuales.map(mes => mes.costo_estimado),
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.2,
                        yAxisID: 'y1'
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: true, text: 'Hojas' }
                      },
                      y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: { display: true, text: 'Costo (CLP)' },
                        grid: { drawOnChartArea: false }
                      }
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Modal de configuración de reportes */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-600 bg-opacity-50 flex items-center justify-center p-4">
          <div 
            className={`bg-white rounded-lg shadow-xl max-w-2xl w-full transform transition-all ${reportModalAnimating ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Configurar Reporte
                </h3>
                <button
                  onClick={handleCloseReportModal}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4 max-h-96 overflow-y-auto">
              {/* Formato del reporte */}
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-900 mb-3">Formato del Reporte</h4>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="format"
                      value="pdf"
                      checked={reportFormat === 'pdf'}
                      onChange={(e) => setReportFormat(e.target.value)}
                      className="form-radio text-teal-600 focus:ring-teal-500"
                    />
                    <span className="ml-2 flex items-center gap-2">
                      <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                      PDF
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="format"
                      value="excel"
                      checked={reportFormat === 'excel'}
                      onChange={(e) => setReportFormat(e.target.value)}
                      className="form-radio text-teal-600 focus:ring-teal-500"
                    />
                    <span className="ml-2 flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                      Excel
                    </span>
                  </label>
                </div>
              </div>

              {/* Secciones a incluir */}
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-900 mb-3">Secciones a Incluir</h4>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={reportOptions.estadisticasGenerales}
                      onChange={(e) => setReportOptions({...reportOptions, estadisticasGenerales: e.target.checked})}
                      className="form-checkbox text-teal-600 focus:ring-teal-500"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">Estadísticas Generales</span>
                  </label>

                  <label className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={reportOptions.desgloseCostos}
                      onChange={(e) => setReportOptions({...reportOptions, desgloseCostos: e.target.checked})}
                      className="form-checkbox text-teal-600 focus:ring-teal-500"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">Desglose de Costos</span>
                  </label>

                  <label className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={reportOptions.tendenciasDiarias}
                      onChange={(e) => setReportOptions({...reportOptions, tendenciasDiarias: e.target.checked})}
                      className="form-checkbox text-teal-600 focus:ring-teal-500"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">Tendencias Diarias</span>
                  </label>

                  <label className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={reportOptions.distribucionTipos}
                      onChange={(e) => setReportOptions({...reportOptions, distribucionTipos: e.target.checked})}
                      className="form-checkbox text-teal-600 focus:ring-teal-500"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">Distribución por Tipos</span>
                  </label>

                  <label className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={reportOptions.distribucionCaras}
                      onChange={(e) => setReportOptions({...reportOptions, distribucionCaras: e.target.checked})}
                      className="form-checkbox text-teal-600 focus:ring-teal-500"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">Distribución por Caras</span>
                  </label>

                  <label className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={reportOptions.analisisEficiencia}
                      onChange={(e) => setReportOptions({...reportOptions, analisisEficiencia: e.target.checked})}
                      className="form-checkbox text-teal-600 focus:ring-teal-500"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">Análisis de Eficiencia</span>
                  </label>

                  <label className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={reportOptions.proyecciones}
                      onChange={(e) => setReportOptions({...reportOptions, proyecciones: e.target.checked})}
                      className="form-checkbox text-teal-600 focus:ring-teal-500"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">Proyecciones</span>
                  </label>

                  <label className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={reportOptions.actividadReciente}
                      onChange={(e) => setReportOptions({...reportOptions, actividadReciente: e.target.checked})}
                      className="form-checkbox text-teal-600 focus:ring-teal-500"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">Actividad Reciente</span>
                  </label>
                </div>
              </div>

              {/* Funcionalidad futura - Email automático */}
              <div className="mb-4">
                <h4 className="text-md font-medium text-gray-900 mb-3">Envío Automático (Próximamente)</h4>
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={autoEmailEnabled}
                      onChange={(e) => setAutoEmailEnabled(e.target.checked)}
                      disabled={true}
                      className="form-checkbox text-yellow-600 focus:ring-yellow-500 opacity-50 cursor-not-allowed"
                    />
                    <span className="ml-3 text-sm text-yellow-800">
                      📧 Enviar reporte mensual automáticamente por email
                    </span>
                  </label>
                  <p className="text-xs text-yellow-700 mt-2 ml-6">
                    Esta funcionalidad estará disponible próximamente
                  </p>
                </div>
              </div>

              {/* Resumen de selección */}
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                <h5 className="font-medium text-teal-800 mb-2">Resumen del Reporte:</h5>
                <div className="text-sm text-teal-700">
                  <p>Formato: <span className="font-medium">{reportFormat.toUpperCase()}</span></p>
                  <p>Secciones seleccionadas: <span className="font-medium">
                    {Object.values(reportOptions).filter(Boolean).length} de {Object.keys(reportOptions).length}
                  </span></p>
                  <p className="text-xs mt-1">
                    Período: {getDateRange().desde || 'N/A'} a {getDateRange().hasta || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setReportOptions({
                      estadisticasGenerales: true,
                      tendenciasDiarias: true,
                      distribucionTipos: true,
                      distribucionCaras: true,
                      analisisEficiencia: true,
                      proyecciones: true,
                      actividadReciente: false,
                      desgloseCostos: true
                    });
                  }}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                >
                  Seleccionar Todo
                </button>
                <button
                  onClick={() => {
                    setReportOptions({
                      estadisticasGenerales: false,
                      tendenciasDiarias: false,
                      distribucionTipos: false,
                      distribucionCaras: false,
                      analisisEficiencia: false,
                      proyecciones: false,
                      actividadReciente: false,
                      desgloseCostos: false
                    });
                  }}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                >
                  Limpiar Todo
                </button>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleCloseReportModal}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGenerateReport}
                  disabled={generatingReport || Object.values(reportOptions).every(v => !v)}
                  className="px-4 py-2 bg-teal-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {generatingReport ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Generando...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Generar Reporte
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de configuración de precios */}
      {showPreciosModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-600 bg-opacity-50 flex items-center justify-center p-4">
          <div 
            className={`bg-white rounded-lg shadow-xl max-w-md w-full transform transition-all ${modalAnimating ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Configuración de Precios</h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio por copia B/N (CLP)
                  </label>
                  <input
                    type="number"
                    value={editingPrecios.precio_bn || ''}
                    onChange={e => setEditingPrecios({...editingPrecios, precio_bn: parseInt(e.target.value) || 0})}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio por copia a Color (CLP)
                  </label>
                  <input
                    type="number"
                    value={editingPrecios.precio_color || ''}
                    onChange={e => setEditingPrecios({...editingPrecios, precio_color: parseInt(e.target.value) || 0})}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio por hoja (CLP)
                  </label>
                  <input
                    type="number"
                    value={editingPrecios.precio_hoja || ''}
                    onChange={e => setEditingPrecios({...editingPrecios, precio_hoja: parseInt(e.target.value) || 0})}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Copias de gracia B/N
                  </label>
                  <input
                    type="number"
                    value={editingPrecios.fotocopia_gracia_bn || ''}
                    onChange={e => setEditingPrecios({...editingPrecios, fotocopia_gracia_bn: parseInt(e.target.value) || 0})}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Copias de gracia Color
                  </label>
                  <input
                    type="number"
                    value={editingPrecios.fotocopia_gracia_color || ''}
                    onChange={e => setEditingPrecios({...editingPrecios, fotocopia_gracia_color: parseInt(e.target.value) || 0})}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 mr-3"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePrecios}
                className="px-4 py-2 bg-teal-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Los toast ahora se manejan a través del ToastContext */}
      
      {loading && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg flex items-center">
            <div className="w-6 h-6 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mr-3"></div>
            <p className="text-gray-700">Cargando estadísticas...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
