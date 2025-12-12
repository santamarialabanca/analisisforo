// Navigation functionality
const navButtons = document.querySelectorAll('.nav-button');
const sections = document.querySelectorAll('.section');

function showSection(sectionId) {
  // Validar que la sección existe
  if (!sectionId) {
    console.warn('showSection: sectionId no proporcionado');
    return;
  }
  
  sections.forEach(section => {
    section.classList.remove('active');
  });
  
  navButtons.forEach(button => {
    button.classList.remove('active');
  });
  
  const targetSection = document.getElementById(sectionId);
  if (!targetSection) {
    console.warn(`showSection: No se encontró la sección con id "${sectionId}"`);
    return;
  }
  
  targetSection.classList.add('active');
  
  const activeButton = document.querySelector(`[data-section="${sectionId}"]`);
  if (activeButton) {
    activeButton.classList.add('active');
  }
  
  // Cargar datos específicos de cada sección si es necesario
  if (sectionId === 'propuestas') {
    setTimeout(() => {
      if (respuestasData && respuestasData.length > 0) {
        updateLists();
      } else {
        document.querySelectorAll('#propuestas .list-container').forEach(container => {
          const ul = container.querySelector('ul');
          if (ul) {
            const loading = ul.querySelector('.loading');
            if (loading) {
              loading.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                  <i class="fas fa-info-circle" style="font-size: 2rem; color: #801836; margin-bottom: 12px; display: block;"></i>
                  <p style="color: #666; margin: 0;">Esperando datos de respuestas...</p>
                </div>
              `;
            }
          }
        });
      }
    }, 150);
  }
  
  if (sectionId === 'asistentes') {
    setTimeout(() => {
      if (asistenciaData && asistenciaData.length > 0) {
        createAsistentesList();
      }
    }, 150);
  }
  
  if (sectionId === 'no-asistentes') {
    setTimeout(() => {
      if ((inscripcionesData && inscripcionesData.length > 0) || (acreditacionesData && acreditacionesData.length > 0)) {
        createNoAsistentesList();
      }
    }, 150);
  }
  
  if (sectionId === 'balance') {
    setTimeout(() => {
      if (acreditacionesData && acreditacionesData.length > 0 && respuestasData && respuestasData.length > 0) {
        createComparativaForos();
      }
    }, 150);
  }
  
  // Scroll suave al inicio
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

navButtons.forEach(button => {
  button.addEventListener('click', () => {
    const sectionId = button.getAttribute('data-section');
    showSection(sectionId);
  });
});

// CSV Parsing - Improved to handle quoted fields with commas
function parseCSV(text) {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  // Parse headers
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine).map(h => h.trim().replace(/^"|"$/g, ''));
  const data = [];
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    
    if (values.length >= headers.length) {
      const obj = {};
      headers.forEach((header, index) => {
        let value = values[index] || '';
        // Remove surrounding quotes if present
        value = value.trim().replace(/^"|"$/g, '');
        obj[header] = value;
      });
      data.push(obj);
    }
  }
  
  return data;
}

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  values.push(current);
  
  return values;
}

// Load CSV files
let acreditacionesData = [];
let asistenciaData = [];
let respuestasData = [];
let inscripcionesData = [];

async function loadData() {
  // Mostrar indicador de carga
  const loadingIndicator = document.querySelector('#resumen .description-box p');
  if (loadingIndicator) {
    loadingIndicator.innerHTML = '<i class="fas fa-chart-line" style="margin-right: 8px; opacity: 0.6;"></i>Cargando datos del XIV Foro de Innovación Educativa...';
  }
  
  try {
    const [acreditaciones, asistencia, respuestas, inscripciones] = await Promise.all([
      fetch('CSV - Acreditaciones.csv').then(r => {
        if (!r.ok) throw new Error(`Error al cargar Acreditaciones: ${r.status}`);
        return r.text();
      }),
      fetch('CSV - Asistencia.csv').then(r => {
        if (!r.ok) throw new Error(`Error al cargar Asistencia: ${r.status}`);
        return r.text();
      }),
      fetch('XIV Foro de Innovación Educativa (respuestas) - Respuestas de formulario 1.csv').then(r => {
        if (!r.ok) throw new Error(`Error al cargar Respuestas: ${r.status}`);
        return r.text();
      }),
      fetch('XIV Foro Innovación Educativa - HUMANIA_ Asistentes (respuestas) - Respuestas de formulario 1 (4).csv').then(r => {
        if (!r.ok) {
          console.warn('No se pudo cargar el archivo de Inscripciones, continuando sin él');
          return '';
        }
        return r.text();
      })
    ]);
    
    acreditacionesData = parseCSV(acreditaciones);
    asistenciaData = parseCSV(asistencia);
    respuestasData = parseCSV(respuestas);
    if (inscripciones) {
      inscripcionesData = parseCSV(inscripciones);
      // Filtrar filas vacías
      inscripcionesData = inscripcionesData.filter(row => row.Nombre && row.Nombre.trim());
    }
    
    // Validar que los datos no estén vacíos
    if (!acreditacionesData || acreditacionesData.length === 0) {
      throw new Error('El archivo de Acreditaciones está vacío o no tiene datos válidos');
    }
    if (!asistenciaData || asistenciaData.length === 0) {
      throw new Error('El archivo de Asistencia está vacío o no tiene datos válidos');
    }
    if (!respuestasData || respuestasData.length === 0) {
      console.warn('El archivo de Respuestas está vacío o no tiene datos válidos');
    }
    
    // Filter out empty rows
    acreditacionesData = acreditacionesData.filter(row => row.Nombre && row.Nombre.trim());
    asistenciaData = asistenciaData.filter(row => row.Nombre && row.Nombre.trim());
    respuestasData = respuestasData.filter(row => row['Soy...'] && row['Soy...'].trim());
    
    // Validar datos después del filtrado
    if (acreditacionesData.length === 0) {
      throw new Error('No se encontraron datos válidos en Acreditaciones después del filtrado');
    }
    if (asistenciaData.length === 0) {
      throw new Error('No se encontraron datos válidos en Asistencia después del filtrado');
    }
    
    analyzeData();
  } catch (error) {
    console.error('Error loading data:', error);
    const errorHTML = `
      <div style="text-align: center; padding: 40px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(247, 245, 246, 0.95) 100%); border-radius: 16px; border: 2px solid rgba(220, 53, 69, 0.3); box-shadow: 0 4px 16px rgba(220, 53, 69, 0.1);">
        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #dc3545; margin-bottom: 16px; display: block;"></i>
        <h3 style="color: #dc3545; font-size: 1.5rem; margin-bottom: 12px;">Error al Cargar los Datos</h3>
        <p style="color: #666; margin-bottom: 16px; line-height: 1.6;">${error.message}</p>
        <p style="color: #666; font-size: 0.9rem; margin-bottom: 20px;">Asegúrate de que los archivos CSV estén en la misma carpeta que el archivo HTML.</p>
        <button onclick="location.reload()" style="background: linear-gradient(135deg, #801836 0%, #6a1430 100%); color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 12px rgba(128, 24, 54, 0.3);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(128, 24, 54, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(128, 24, 54, 0.3)'">
          <i class="fas fa-redo" style="margin-right: 8px;"></i>Reintentar
        </button>
      </div>
    `;
    const resumenSection = document.getElementById('resumen');
    if (resumenSection) {
      resumenSection.innerHTML = `<h2 class="section-title">Error</h2>${errorHTML}`;
    }
  }
}

// Analysis functions
function analyzeData() {
  updateMetrics();
  updateCharts();
  updateTables();
  updateLists();
}

// Función para animar números
function animateValue(element, start, end, duration, suffix = '') {
  const startTime = performance.now();
  const isDecimal = end.toString().includes('.');
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing function (ease-out)
    const easeOut = 1 - Math.pow(1 - progress, 3);
    
    let current = start + (end - start) * easeOut;
    
    if (isDecimal) {
      element.textContent = current.toFixed(suffix === '%' ? 1 : 2) + suffix;
    } else {
      element.textContent = Math.floor(current) + suffix;
    }
    
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      if (isDecimal) {
        element.textContent = end.toFixed(suffix === '%' ? 1 : 2) + suffix;
      } else {
        element.textContent = end + suffix;
      }
    }
  }
  
  requestAnimationFrame(update);
}

function updateMetrics() {
  // Datos reales 2025: 262 inscritos, 216 asistentes
  const acreditados = 262; // Inscritos 2025
  const asistentes = 216; // Asistentes 2025
  const tasaAsistencia = acreditados > 0 ? ((asistentes / acreditados) * 100) : 0;
  const valoraciones = respuestasData.length;
  const tasaRespuesta = asistentes > 0 ? ((valoraciones / asistentes) * 100) : 0;
  
  // Calculate average rating
  let totalRating = 0;
  let ratingCount = 0;
  respuestasData.forEach(row => {
    const rating = parseFloat(row['¿En qué grado recomendarías el Foro de Innovación Educativa?']);
    if (!isNaN(rating)) {
      totalRating += rating;
      ratingCount++;
    }
  });
  const valoracionMedia = ratingCount > 0 ? (totalRating / ratingCount) : 0;
  
  // Animar los valores con efecto de conteo
  const cards = document.querySelectorAll('#resumen .metric-card');
  if (cards.length >= 6) {
    setTimeout(() => animateValue(cards[0].querySelector('.metric-value'), 0, acreditados, 1000), 100);
    setTimeout(() => animateValue(cards[1].querySelector('.metric-value'), 0, asistentes, 1000), 200);
    setTimeout(() => animateValue(cards[2].querySelector('.metric-value'), 0, tasaAsistencia, 1000, '%'), 300);
    setTimeout(() => animateValue(cards[3].querySelector('.metric-value'), 0, valoraciones, 1000), 400);
    setTimeout(() => animateValue(cards[4].querySelector('.metric-value'), 0, tasaRespuesta, 1000, '%'), 500);
    setTimeout(() => animateValue(cards[5].querySelector('.metric-value'), 0, valoracionMedia, 1000), 600);
  }
  
  // Agregar efectos visuales a las tarjetas de métricas
  cards.forEach((card, index) => {
    card.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    card.style.cursor = 'pointer';
    card.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-5px) scale(1.02)';
      this.style.boxShadow = '0 12px 40px rgba(128, 24, 54, 0.2)';
    });
    card.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0) scale(1)';
      this.style.boxShadow = '';
    });
  });
  
  // Update description con más contexto
  const descripcion = document.querySelector('#resumen .description-box p');
  if (descripcion) {
    descripcion.innerHTML = `
      <strong>Resumen del XIV Foro de Innovación Educativa - HUMANIA:</strong><br>
      • <strong>${acreditados} inscritos</strong> (personas que se inscribieron)<br>
      • <strong>${asistentes} asistentes</strong> - ${tasaAsistencia.toFixed(1)}% de tasa de asistencia<br>
      • <strong>${valoraciones} valoraciones</strong> recibidas - ${tasaRespuesta.toFixed(1)}% de tasa de respuesta (calculada sobre asistentes)<br>
      • <strong>Valoración media: ${valoracionMedia.toFixed(2)}/5</strong> ${valoracionMedia >= 4 ? '⭐ Excelente' : valoracionMedia >= 3.5 ? '👍 Buena' : '📊 Aceptable'}
    `;
  }
}

function updateCharts() {
  // Role distribution comparison
  const rolesAcreditados = {};
  const rolesAsistentes = {};
  
  acreditacionesData.forEach(row => {
    const rol = row.Rol || 'Sin especificar';
    rolesAcreditados[rol] = (rolesAcreditados[rol] || 0) + 1;
  });
  
  asistenciaData.forEach(row => {
    const rol = row.Rol || 'Sin especificar';
    rolesAsistentes[rol] = (rolesAsistentes[rol] || 0) + 1;
  });
  
  // Perfil de encuestados
  const perfilesEncuestados = {};
  respuestasData.forEach(row => {
    const perfil = row['Soy...']?.trim();
    if (perfil) {
      perfilesEncuestados[perfil] = (perfilesEncuestados[perfil] || 0) + 1;
    }
  });
  
  // Cómo se enteraron del evento
  const comoSeEnteraron = {};
  respuestasData.forEach(row => {
    const fuente = row['¿Cómo te enteraste de nuestro evento?']?.trim();
    if (fuente) {
      comoSeEnteraron[fuente] = (comoSeEnteraron[fuente] || 0) + 1;
    }
  });
  
  // Valoración charla inspiracional
  const valoracionCharla = {};
  respuestasData.forEach(row => {
    const valoracion = row['Si pudiste asistir a la apertura  ¿Cómo valorarías la charla inspiracional?']?.trim();
    if (valoracion && !isNaN(parseFloat(valoracion))) {
      const v = parseFloat(valoracion);
      valoracionCharla[v] = (valoracionCharla[v] || 0) + 1;
    }
  });
  
  // Workshop analysis - Compare acreditaciones vs asistencia
  const talleres1730Acreditados = {};
  const talleres1830Acreditados = {};
  const talleres1730Asistentes = {};
  const talleres1830Asistentes = {};
  
  // Count from acreditaciones
  acreditacionesData.forEach(row => {
    const taller1730 = row['17:30']?.trim();
    const taller1830 = row['18:30']?.trim();
    
    if (taller1730 && taller1730 !== 'Primera sesión' && taller1730 !== '') {
      const nombreTaller = extractTallerName(taller1730);
      talleres1730Acreditados[nombreTaller] = (talleres1730Acreditados[nombreTaller] || 0) + 1;
    }
    
    if (taller1830 && taller1830 !== 'Segunda sesión' && taller1830 !== '') {
      const nombreTaller = extractTallerName(taller1830);
      talleres1830Acreditados[nombreTaller] = (talleres1830Acreditados[nombreTaller] || 0) + 1;
    }
  });
  
  // Primero, buscar el nombre del taller 10 en los datos originales para mantener consistencia
  let nombreTaller10 = null;
  for (const row of asistenciaData) {
    const taller1830 = row['18:30']?.trim();
    if (taller1830 && taller1830 !== 'Segunda sesión' && taller1830.match(/^10\./)) {
      nombreTaller10 = extractTallerName(taller1830);
      break;
    }
  }
  // Si no se encuentra, buscar en acreditaciones
  if (!nombreTaller10) {
    for (const row of acreditacionesData) {
      const taller1830 = row['18:30']?.trim();
      if (taller1830 && taller1830 !== 'Segunda sesión' && taller1830.match(/^10\./)) {
        nombreTaller10 = extractTallerName(taller1830);
        break;
      }
    }
  }
  // Si aún no se encuentra, usar un nombre genérico
  if (!nombreTaller10) {
    nombreTaller10 = '10. Taller 10';
  }
  
  // Count from asistencia
  asistenciaData.forEach(row => {
    const taller1730 = row['17:30']?.trim();
    const taller1830 = row['18:30']?.trim();
    
    if (taller1730 && taller1730 !== 'Primera sesión' && taller1730 !== '') {
      const nombreTaller = extractTallerName(taller1730);
      talleres1730Asistentes[nombreTaller] = (talleres1730Asistentes[nombreTaller] || 0) + 1;
    }
    
    if (taller1830 && taller1830 !== 'Segunda sesión' && taller1830 !== '') {
      // Detectar si es el taller 17 y moverlo al taller 10
      const match17 = taller1830.match(/^17\./);
      if (match17) {
        // Mover la persona al taller 10
        talleres1830Asistentes[nombreTaller10] = (talleres1830Asistentes[nombreTaller10] || 0) + 1;
      } else {
        const nombreTaller = extractTallerName(taller1830);
        talleres1830Asistentes[nombreTaller] = (talleres1830Asistentes[nombreTaller] || 0) + 1;
      }
    }
  });
  
  // Asignar a variables globales para la comparativa
  window.talleres1730Asistentes = talleres1730Asistentes;
  window.talleres1830Asistentes = talleres1830Asistentes;
  
  // Use asistencia data for display (more accurate)
  const talleres1730 = talleres1730Asistentes;
  const talleres1830 = talleres1830Asistentes;
  
  // Ratings distribution
  const ratings = {};
  respuestasData.forEach(row => {
    const rating = row['¿En qué grado recomendarías el Foro de Innovación Educativa?'];
    if (rating && !isNaN(parseFloat(rating))) {
      const r = parseFloat(rating);
      ratings[r] = (ratings[r] || 0) + 1;
    }
  });
  
  // Create charts (using simple HTML/CSS visualization for now)
  createAcreditacionesStaffChart();
  createRoleChart(rolesAcreditados, rolesAsistentes);
  createWorkshopCharts(talleres1730, talleres1830);
  createResumenTalleres(talleres1730, talleres1830);
  createRatingChart(ratings);
  createResumenValoracion(ratings, valoracionCharla);
  createProfileChart(perfilesEncuestados);
  createSourceChart(comoSeEnteraron);
  createCharlaChart(valoracionCharla);
  createWorkshopRatings(); // Calcula y muestra las valoraciones de talleres
  createNPSChart(); // Calcula y muestra el NPS
  
  // Análisis de inscripciones si hay datos disponibles
  if (inscripcionesData && inscripcionesData.length > 0) {
    createInscripcionesAnalysis();
  }
  
  // Listado de asistentes y no asistentes
  createAsistentesList();
  createNoAsistentesList();
  
  // Comparativa con Foro XIII
  createComparativaForos();
}

function createRoleChart(rolesAcreditados, rolesAsistentes) {
  // Buscar el contenedor correcto por el título
  const containers = document.querySelectorAll('#resumen .chart-container');
  let container = null;
  for (const c of containers) {
    const h3 = c.querySelector('h3');
    if (h3 && h3.textContent.includes('Comparación de Roles')) {
      container = c;
      break;
    }
  }
  // Si no se encuentra, usar el último disponible
  if (!container && containers.length > 0) {
    container = containers[containers.length - 1];
  }
  if (!container) {
    console.warn('createRoleChart: No se encontró el contenedor');
    return;
  }
  
  const roles = [...new Set([...Object.keys(rolesAcreditados), ...Object.keys(rolesAsistentes)])];
  
  // Usar valores reales: 262 inscritos, 216 asistentes (2025)
  const totalAcreditados = 262; // Total real de inscritos 2025
  const totalAsistentes = 216; // Total real de asistentes 2025
  const tasaAsistenciaGeneral = totalAcreditados > 0 ? ((totalAsistentes / totalAcreditados) * 100).toFixed(1) : 0;
  
  // Crear gráfico combinado con barras y comparación visual mejorado
  let html = `
    <div style="margin-top: 20px; padding: 28px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(247, 245, 246, 0.95) 100%); border-radius: 16px; border: 1px solid rgba(128, 24, 54, 0.12); box-shadow: 0 4px 16px rgba(128, 24, 54, 0.08);">
      <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid rgba(128, 24, 54, 0.1);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
          <div>
            <h4 style="color: #801836; font-size: 18px; font-weight: 700; margin: 0 0 8px 0; display: flex; align-items: center; gap: 8px;">
              <i class="fas fa-users" style="font-size: 18px;"></i>
              Distribución por Rol
            </h4>
            <p style="font-size: 13px; color: #666; margin: 0; line-height: 1.5;">
              Comparación entre personas <strong>inscritas</strong> y <strong>asistentes</strong> por tipo de rol.
            </p>
          </div>
          <div style="display: flex; gap: 16px; flex-wrap: wrap;">
            <div style="text-align: center; padding: 12px 16px; background: rgba(128, 24, 54, 0.05); border-radius: 8px; border: 1px solid rgba(128, 24, 54, 0.1);">
              <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Total Inscritos</div>
              <div style="font-size: 24px; font-weight: 700; color: #801836;">${totalAcreditados}</div>
            </div>
            <div style="text-align: center; padding: 12px 16px; background: rgba(40, 167, 69, 0.05); border-radius: 8px; border: 1px solid rgba(40, 167, 69, 0.1);">
              <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Total Asistentes</div>
              <div style="font-size: 24px; font-weight: 700; color: #28a745;">${totalAsistentes}</div>
            </div>
            <div style="text-align: center; padding: 12px 16px; background: linear-gradient(135deg, rgba(128, 24, 54, 0.1) 0%, rgba(128, 24, 54, 0.05) 100%); border-radius: 8px; border-left: 3px solid #801836;">
              <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Tasa Asistencia</div>
              <div style="font-size: 24px; font-weight: 700; color: ${parseFloat(tasaAsistenciaGeneral) >= 80 ? '#28a745' : parseFloat(tasaAsistenciaGeneral) >= 60 ? '#ffc107' : '#dc3545'};">${tasaAsistenciaGeneral}%</div>
            </div>
          </div>
        </div>
      </div>
      <div style="display: grid; gap: 20px;">
  `;
  
  roles.forEach((rol, index) => {
    const acreditados = rolesAcreditados[rol] || 0;
    const asistentes = rolesAsistentes[rol] || 0;
    const porcentaje = acreditados > 0 ? ((asistentes / acreditados) * 100) : 0;
    const diferencia = acreditados - asistentes;
    const maxValue = Math.max(...roles.map(r => rolesAcreditados[r] || 0), 1);
    const porcentajeAcreditados = (acreditados / maxValue) * 100;
    const porcentajeAsistentes = (asistentes / maxValue) * 100;
    const colors = ['#801836', '#9a1f42', '#b4284e', '#ce315a'];
    const color = colors[index % colors.length];
    
    // Indicador de rendimiento
    const rendimientoColor = parseFloat(porcentaje) >= 80 ? '#28a745' : parseFloat(porcentaje) >= 60 ? '#ffc107' : '#dc3545';
    const rendimientoIcon = parseFloat(porcentaje) >= 80 ? 'fa-check-circle' : parseFloat(porcentaje) >= 60 ? 'fa-exclamation-circle' : 'fa-times-circle';
    const rendimientoTexto = parseFloat(porcentaje) >= 80 ? 'Excelente' : parseFloat(porcentaje) >= 60 ? 'Buena' : 'Mejorable';
    
    html += `
      <div style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(247, 245, 246, 0.9) 100%); backdrop-filter: blur(10px); border: 1px solid rgba(128, 24, 54, 0.1); padding: 20px; border-radius: 12px; border-left: 4px solid ${color}; box-shadow: 0 2px 8px rgba(128, 24, 54, 0.05); transition: all 0.3s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(128, 24, 54, 0.15)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(128, 24, 54, 0.05)'">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; gap: 16px; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 200px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <strong style="color: #801836; font-size: 18px; font-weight: 700;">${rol}</strong>
              <span style="background: ${rendimientoColor}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                <i class="fas ${rendimientoIcon}" style="font-size: 10px;"></i>
                ${rendimientoTexto}
              </span>
            </div>
            <div style="font-size: 12px; color: #666; line-height: 1.5;">
              <div style="margin-bottom: 4px;">
                <strong style="color: ${color};">Tasa de asistencia: ${porcentaje.toFixed(1)}%</strong>
                ${diferencia > 0 ? `<span style="color: #999; font-size: 11px;"> (${diferencia} no asistieron)</span>` : ''}
              </div>
              <div style="font-size: 11px; color: #999; font-style: italic;">
                ${acreditados} inscritos → ${asistentes} asistentes
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
            <div style="text-align: center; padding: 10px 14px; background: linear-gradient(135deg, rgba(128, 24, 54, 0.1) 0%, rgba(128, 24, 54, 0.05) 100%); border-radius: 8px; border: 1px solid rgba(128, 24, 54, 0.2); min-width: 90px;">
              <div style="font-size: 10px; color: #666; margin-bottom: 4px; font-weight: 600;">Inscritos</div>
              <strong style="color: #801836; font-size: 22px; font-weight: 700;">${acreditados}</strong>
              <div style="font-size: 10px; color: #999; margin-top: 2px;">${totalAcreditados > 0 ? ((acreditados / totalAcreditados) * 100).toFixed(1) : 0}% del total</div>
            </div>
            <div style="text-align: center; padding: 10px 14px; background: linear-gradient(135deg, rgba(40, 167, 69, 0.1) 0%, rgba(40, 167, 69, 0.05) 100%); border-radius: 8px; border: 1px solid rgba(40, 167, 69, 0.2); min-width: 90px;">
              <div style="font-size: 10px; color: #666; margin-bottom: 4px; font-weight: 600;">Asistentes</div>
              <strong style="color: ${color}; font-size: 22px; font-weight: 700;">${asistentes}</strong>
              <div style="font-size: 10px; color: #999; margin-top: 2px;">${totalAsistentes > 0 ? ((asistentes / totalAsistentes) * 100).toFixed(1) : 0}% del total</div>
            </div>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div>
            <div style="font-size: 12px; color: #666; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
              <i class="fas fa-user-check" style="color: #801836; font-size: 12px;"></i>
              Inscritos (relativo)
            </div>
            <div style="position: relative; height: 28px; background: rgba(128, 24, 54, 0.1); border-radius: 6px; overflow: hidden; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);">
              <div style="position: absolute; left: 0; top: 0; height: 100%; width: 0%; background: linear-gradient(135deg, #801836 0%, #6a1430 100%); border-radius: 6px; transition: width 0.8s ease ${index * 0.1}s; display: flex; align-items: center; justify-content: flex-end; padding-right: 8px;">
                <span style="color: white; font-size: 11px; font-weight: 700; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">${acreditados}</span>
              </div>
            </div>
          </div>
          <div>
            <div style="font-size: 12px; color: #666; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
              <i class="fas fa-user-friends" style="color: ${color}; font-size: 12px;"></i>
              Asistentes (relativo)
            </div>
            <div style="position: relative; height: 28px; background: rgba(128, 24, 54, 0.1); border-radius: 6px; overflow: hidden; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);">
              <div style="position: absolute; left: 0; top: 0; height: 100%; width: 0%; background: linear-gradient(135deg, ${color} 0%, #801836 100%); border-radius: 6px; transition: width 0.8s ease ${index * 0.1 + 0.2}s; display: flex; align-items: center; justify-content: flex-end; padding-right: 8px;">
                <span style="color: white; font-size: 11px; font-weight: 700; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">${asistentes}</span>
              </div>
            </div>
          </div>
        </div>
        <div style="margin-top: 12px;">
          <div style="font-size: 11px; color: #666; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
            <span><i class="fas fa-percentage" style="font-size: 10px; margin-right: 4px;"></i>Tasa de Asistencia</span>
            <span style="font-weight: 600; color: ${rendimientoColor};">${porcentaje.toFixed(1)}%</span>
          </div>
          <div style="height: 10px; background: rgba(128, 24, 54, 0.1); border-radius: 5px; overflow: hidden; position: relative; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);">
            <div style="height: 100%; width: 0%; background: linear-gradient(135deg, ${rendimientoColor} 0%, ${color} 100%); border-radius: 5px; transition: width 0.8s ease ${index * 0.1 + 0.4}s; box-shadow: 0 1px 4px rgba(0,0,0,0.2);" data-width="${porcentaje}"></div>
          </div>
        </div>
      </div>
    `;
  });
  
  html += '</div></div>';
  
  const wrapper = container.querySelector('.chart-wrapper');
  if (wrapper) {
    // Eliminar elementos de carga
    wrapper.querySelectorAll('.loading').forEach(el => el.remove());
    wrapper.innerHTML = html;
    // Animar las barras
    setTimeout(() => {
      wrapper.querySelectorAll('[data-width]').forEach(bar => {
        bar.style.width = bar.getAttribute('data-width') + '%';
      });
    }, 100);
  } else {
    console.warn('createRoleChart: No se encontró .chart-wrapper');
  }
}

// Función para identificar si un email pertenece a un docente del colegio
function esDocenteColegio(email) {
  if (!email) return false;
  return email.toLowerCase().includes('@p.csmb');
}

// Función para normalizar nombres de instituciones (unificar variaciones)
// Si la institución está vacía pero el email es @p.csmb, devuelve "CSMB"
function normalizarInstitucion(institucion, email = null) {
  // Si la institución está vacía pero el email es @p.csmb, asignar CSMB
  if ((!institucion || !institucion.trim()) && email && esDocenteColegio(email)) {
    return 'CSMB';
  }
  
  if (!institucion || !institucion.trim()) return '';
  
  // Normalizar: quitar acentos, convertir a minúsculas, quitar espacios extra
  let normalizado = institucion
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/\s+/g, ' ') // Normalizar espacios
    .replace(/[.,\-_]/g, '') // Quitar puntuación
    .trim();
  
  // Unificar variaciones de CSMB/Camb
  if (normalizado === 'csmb' || 
      normalizado === 'smb' || 
      normalizado === 's m b' ||
      normalizado === 'camb') {
    return 'CSMB';
  }
  
  // Unificar variaciones de Colegio Santa María la Blanca
  // Incluye: "Sta. María La Blanca", "Escuelita", "Secundaria", "Eso", "Santa Mª La Blanca", "Docente", etc.
  if (normalizado.includes('santa maria la blanca') || 
      normalizado.includes('santamarialablanca') ||
      normalizado.includes('sta maria la blanca') ||
      normalizado.includes('sta maria') ||
      normalizado.includes('santa m la blanca') ||
      normalizado.includes('santa mª la blanca') ||
      normalizado.includes('santa m. la blanca') ||
      normalizado === 'escuelita' ||
      normalizado === 'secundaria' ||
      normalizado === 'eso' ||
      normalizado === 'docente' ||
      normalizado.includes('santa maria') && normalizado.includes('blanca') ||
      normalizado.includes('santa m') && normalizado.includes('blanca')) {
    // Todas estas variaciones van a "Colegio Santa María la Blanca"
    return 'Colegio Santa María la Blanca';
  }
  
  // Si no coincide con ninguna variación conocida, devolver el original
  // pero con capitalización apropiada (primera letra de cada palabra en mayúscula)
  return institucion.trim()
    .split(' ')
    .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase())
    .join(' ');
}

function extractTallerName(tallerText) {
  if (!tallerText) return '';
  
  // Extract number and first part of title (before "A)" or "B)" if present)
  const match = tallerText.match(/^(\d+)\.\s*(.+?)(?:\s+[A-Z]\)|$)/);
  if (match && match[2]) {
    const title = match[2].trim();
    return `${match[1]}. ${title.substring(0, 60)}`.trim();
  }
  
  // Fallback: take first 60 characters
  return tallerText.substring(0, 60).trim();
}

function createWorkshopCharts(talleres1730, talleres1830) {
  // Buscar contenedores por título en lugar de asumir el orden
  const allContainers = document.querySelectorAll('#talleres .chart-container');
  let container1730 = null;
  let container1830 = null;
  
  for (const c of allContainers) {
    const h3 = c.querySelector('h3');
    if (h3) {
      if (h3.textContent.includes('17:30')) {
        container1730 = c;
      } else if (h3.textContent.includes('18:30')) {
        container1830 = c;
      }
    }
  }
  
  // Función auxiliar para crear gráfico de barras horizontal
  function createBarChart(sortedData, maxCount, is1830 = false) {
    if (sortedData.length === 0) {
      return `<div style="text-align: center; padding: 40px; background: rgba(247, 245, 246, 0.5); border-radius: 12px; border: 2px dashed rgba(128, 24, 54, 0.2);">
        <i class="fas fa-info-circle" style="font-size: 2rem; color: #801836; margin-bottom: 12px; display: block;"></i>
        <p style="color: #666; font-size: 14px; margin: 0;">No hay datos disponibles</p>
      </div>`;
    }
    
    const colors = [
      'linear-gradient(135deg, #801836 0%, #6a1430 100%)',
      'linear-gradient(135deg, #9a1f42 0%, #801836 100%)',
      'linear-gradient(135deg, #b4284e 0%, #9a1f42 100%)',
      'linear-gradient(135deg, #ce315a 0%, #b4284e 100%)',
      'linear-gradient(135deg, #e83966 0%, #ce315a 100%)'
    ];
    
    // Excluir el taller 17 anulado del cálculo del total y promedio
    const datosActivos = sortedData.filter(([taller, count]) => !(is1830 && taller.startsWith('17.') && count === 0));
    const totalAsistentes = datosActivos.reduce((sum, [_, count]) => sum + count, 0);
    const promedioAsistentes = datosActivos.length > 0 ? (totalAsistentes / datosActivos.length).toFixed(1) : 0;
  
  let html = `
    <div style="margin-bottom: 20px; padding: 16px; background: linear-gradient(135deg, rgba(128, 24, 54, 0.05) 0%, rgba(128, 24, 54, 0.02) 100%); border-radius: 12px; border-left: 4px solid #801836;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        <div>
          <div style="font-size: 14px; font-weight: 700; color: #801836; margin-bottom: 4px;">
            <i class="fas fa-info-circle" style="margin-right: 6px;"></i>
            Resumen de la Sesión
          </div>
          <div style="font-size: 12px; color: #666;">
            Total de asistencias: <strong>${totalAsistentes}</strong> | Promedio por taller: <strong>${promedioAsistentes}</strong> asistentes
          </div>
        </div>
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <div style="text-align: center; padding: 8px 12px; background: rgba(128, 24, 54, 0.1); border-radius: 8px;">
            <div style="font-size: 10px; color: #666; margin-bottom: 2px;">Total Talleres</div>
            <div style="font-size: 18px; font-weight: 700; color: #801836;">${datosActivos.length}</div>
          </div>
          <div style="text-align: center; padding: 8px 12px; background: rgba(40, 167, 69, 0.1); border-radius: 8px;">
            <div style="font-size: 10px; color: #666; margin-bottom: 2px;">Total Asistencias</div>
            <div style="font-size: 18px; font-weight: 700; color: #28a745;">${totalAsistentes}</div>
          </div>
        </div>
      </div>
    </div>
    <div style="display: flex; flex-direction: column; gap: 16px; margin-top: 20px;">
  `;
  
    sortedData.forEach(([taller, count], index) => {
      // Detectar si es el taller 17 de la sesión 18:30 y está anulado
      const esTaller17Anulado = is1830 && taller.startsWith('17.') && count === 0;
      const porcentaje = maxCount > 0 && !esTaller17Anulado ? (count / maxCount) * 100 : 0;
      const porcentajeDelTotal = totalAsistentes > 0 && !esTaller17Anulado ? ((count / totalAsistentes) * 100).toFixed(1) : 0;
      const color = colors[index % colors.length];
      const tallerEscapado = taller.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      
      // Indicador de popularidad (no aplica si está anulado)
      const esPopular = !esTaller17Anulado && count >= promedioAsistentes;
      const popularidadIcon = esPopular ? 'fa-fire' : 'fa-chart-line';
      const popularidadColor = esPopular ? '#ff6b35' : '#801836';
      
      html += `
        <div style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(247, 245, 246, 0.9) 100%); backdrop-filter: blur(10px); border: 1px solid rgba(128, 24, 54, 0.1); padding: 20px; border-radius: 12px; transition: all 0.3s; border-left: 4px solid ${esTaller17Anulado ? '#999' : '#801836'}; box-shadow: 0 2px 8px rgba(128, 24, 54, 0.05); opacity: ${esTaller17Anulado ? '0.6' : '1'};" onmouseover="this.style.transform='translateX(4px)'; this.style.boxShadow='0 4px 12px rgba(128, 24, 54, 0.15)'" onmouseout="this.style.transform='translateX(0)'; this.style.boxShadow='0 2px 8px rgba(128, 24, 54, 0.05)'">
          <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 12px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 250px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <div style="font-size: 14px; font-weight: 600; color: ${esTaller17Anulado ? '#999' : '#1a1a1a'}; line-height: 1.3; word-wrap: break-word;">${tallerEscapado}${esTaller17Anulado ? ' - ANULADO' : ''}</div>
                ${esPopular ? `<i class="fas ${popularidadIcon}" style="color: ${popularidadColor}; font-size: 14px;" title="Taller popular"></i>` : ''}
              </div>
              ${!esTaller17Anulado ? `<div style="font-size: 11px; color: #999; font-style: italic;">
                ${porcentajeDelTotal}% del total de asistencias de esta sesión
              </div>` : ''}
            </div>
            <div style="flex: 1; position: relative; min-width: 200px;">
              <div style="position: relative; height: 40px; background: rgba(128, 24, 54, 0.1); border-radius: 8px; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);">
                ${!esTaller17Anulado ? `<div style="position: absolute; left: 0; top: 0; height: 100%; width: 0%; background: ${color}; border-radius: 8px; transition: width 1s ease ${index * 0.1}s; display: flex; align-items: center; justify-content: flex-end; padding-right: 16px; box-shadow: 0 2px 8px rgba(128, 24, 54, 0.3);" data-width="${porcentaje}">
                  <span style="color: white; font-weight: 700; font-size: 15px; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">${count}</span>
                </div>` : `<div style="position: absolute; left: 0; top: 0; height: 100%; width: 100%; background: rgba(153, 153, 153, 0.3); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                  <span style="color: #666; font-weight: 700; font-size: 15px; text-transform: uppercase;">ANULADO</span>
                </div>`}
              </div>
            </div>
            <div style="flex: 0 0 100px; text-align: right;">
              <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                ${!esTaller17Anulado ? `<div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px;">
                  <i class="fas fa-users" style="color: #801836; font-size: 16px;"></i>
                  <strong style="color: #801836; font-size: 22px; font-weight: 700;">${count}</strong>
                </div>
                <div style="font-size: 11px; color: #666; font-style: italic;">asistentes</div>` : `<div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px;">
                  <strong style="color: #999; font-size: 18px; font-weight: 700; text-transform: uppercase;">ANULADO</strong>
                </div>`}
              </div>
            </div>
          </div>
        </div>
      `;
    });
    html += '</div>';
    return html;
  }
  
  // Procesar sesión 17:30
  if (container1730) {
    const sorted1730 = Object.entries(talleres1730)
      .sort((a, b) => b[1] - a[1]);
    const max1730 = sorted1730.length > 0 ? sorted1730[0][1] : 1;
    
    const wrapper = container1730.querySelector('.chart-wrapper');
    if (wrapper) {
      // Eliminar elementos de carga
      wrapper.querySelectorAll('.loading').forEach(el => el.remove());
      wrapper.innerHTML = createBarChart(sorted1730, max1730);
      // Animar las barras
      setTimeout(() => {
        wrapper.querySelectorAll('[data-width]').forEach(bar => {
          bar.style.width = bar.getAttribute('data-width') + '%';
        });
      }, 100);
    } else {
      console.warn('createWorkshopCharts: No se encontró .chart-wrapper para 17:30');
    }
  } else {
    console.warn('createWorkshopCharts: No se encontró el contenedor para 17:30');
  }
  
  // Procesar sesión 18:30
  if (container1830) {
    // Agregar el taller 17 como "ANULADO" si no existe
    const taller17Existe = Object.keys(talleres1830).some(key => key.startsWith('17.'));
    if (!taller17Existe) {
      // Buscar el nombre completo del taller 17 en los datos originales
      const taller17Original = asistenciaData.find(row => {
        const taller1830 = row['18:30']?.trim();
        return taller1830 && taller1830.match(/^17\./);
      });
      if (taller17Original) {
        const nombreTaller17 = extractTallerName(taller17Original['18:30']);
        talleres1830[nombreTaller17] = 0; // Marcar como 0 para mostrar ANULADO
      } else {
        // Si no se encuentra, crear uno genérico
        talleres1830['17. ANULADO'] = 0;
      }
    } else {
      // Si existe, marcarlo como 0 para mostrar ANULADO
      const key17 = Object.keys(talleres1830).find(key => key.startsWith('17.'));
      if (key17) {
        talleres1830[key17] = 0;
      }
    }
    
    const sorted1830 = Object.entries(talleres1830)
      .sort((a, b) => {
        // El taller 17 (ANULADO) debe ir al final
        if (a[0].startsWith('17.')) return 1;
        if (b[0].startsWith('17.')) return -1;
        return b[1] - a[1];
      });
    const max1830 = sorted1830.length > 0 ? Math.max(...sorted1830.filter(([key]) => !key.startsWith('17.')).map(([_, count]) => count), 1) : 1;
    
    const wrapper = container1830.querySelector('.chart-wrapper');
    if (wrapper) {
      // Eliminar elementos de carga
      wrapper.querySelectorAll('.loading').forEach(el => el.remove());
      wrapper.innerHTML = createBarChart(sorted1830, max1830, true); // Pasar true para indicar que es 18:30
      // Animar las barras
      setTimeout(() => {
        wrapper.querySelectorAll('[data-width]').forEach(bar => {
          bar.style.width = bar.getAttribute('data-width') + '%';
        });
      }, 100);
    } else {
      console.warn('createWorkshopCharts: No se encontró .chart-wrapper para 18:30');
    }
  } else {
    console.warn('createWorkshopCharts: No se encontró el contenedor para 18:30');
  }
}

// Función para crear gráfico de comparación Acreditaciones vs Staff
function createAcreditacionesStaffChart() {
  // Buscar el contenedor correcto por el título
  const containers = document.querySelectorAll('#resumen .chart-container');
  let container = null;
  for (const c of containers) {
    const h3 = c.querySelector('h3');
    if (h3 && h3.textContent.includes('Comparación Acreditaciones vs Staff')) {
      container = c;
      break;
    }
  }
  if (!container) {
    console.warn('createAcreditacionesStaffChart: No se encontró el contenedor');
    return;
  }
  
  // Calcular acreditados totales
  const totalAcreditados = acreditacionesData.length;
  
  // Calcular staff (personas con email @p.csmb)
  const acreditadosStaff = acreditacionesData.filter(row => {
    const email = row.Email?.trim()?.toLowerCase();
    return email && email.endsWith('@p.csmb');
  }).length;
  
  const acreditadosNoStaff = totalAcreditados - acreditadosStaff;
  
  // Calcular asistentes con talleres
  const asistentesConTalleres = asistenciaData.filter(row => {
    const taller1730 = row['17:30']?.trim();
    const taller1830 = row['18:30']?.trim();
    return (taller1730 && taller1730 !== '' && taller1730 !== 'Primera sesión') ||
           (taller1830 && taller1830 !== '' && taller1830 !== 'Segunda sesión');
  });
  
  const totalAsistentes = asistentesConTalleres.length;
  
  // Calcular asistentes staff
  const asistentesStaff = asistentesConTalleres.filter(row => {
    const email = row.Email?.trim()?.toLowerCase();
    return email && email.endsWith('@p.csmb');
  }).length;
  
  const asistentesNoStaff = totalAsistentes - asistentesStaff;
  
  // Calcular tasas
  const tasaAsistenciaStaff = acreditadosStaff > 0 ? ((asistentesStaff / acreditadosStaff) * 100).toFixed(1) : 0;
  const tasaAsistenciaNoStaff = acreditadosNoStaff > 0 ? ((asistentesNoStaff / acreditadosNoStaff) * 100).toFixed(1) : 0;
  const tasaAsistenciaGeneral = totalAcreditados > 0 ? ((totalAsistentes / totalAcreditados) * 100).toFixed(1) : 0;
  
  let html = `
    <div style="margin-top: 20px; padding: 28px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(247, 245, 246, 0.95) 100%); border-radius: 16px; border: 1px solid rgba(128, 24, 54, 0.12); box-shadow: 0 4px 16px rgba(128, 24, 54, 0.08);">
      <div style="margin-bottom: 24px; padding-bottom: 20px; border-bottom: 2px solid rgba(128, 24, 54, 0.1);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
          <div>
            <h4 style="color: #801836; font-size: 18px; font-weight: 700; margin: 0 0 8px 0; display: flex; align-items: center; gap: 8px;">
              <i class="fas fa-users" style="font-size: 18px;"></i>
              Comparación Inscripciones vs Staff
            </h4>
            <p style="font-size: 13px; color: #666; margin: 0; line-height: 1.5;">
              Análisis comparativo entre <strong>inscripciones</strong> y <strong>asistentes reales</strong> (que participaron en talleres), diferenciando entre <strong>staff del colegio</strong> (docentes @p.csmb) y <strong>asistentes externos</strong>.
            </p>
          </div>
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <div style="text-align: center; padding: 12px 16px; background: rgba(128, 24, 54, 0.05); border-radius: 8px; border: 1px solid rgba(128, 24, 54, 0.1);">
              <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Total Inscritos</div>
              <div style="font-size: 24px; font-weight: 700; color: #801836;">${totalAcreditados}</div>
            </div>
            <div style="text-align: center; padding: 12px 16px; background: rgba(40, 167, 69, 0.05); border-radius: 8px; border: 1px solid rgba(40, 167, 69, 0.1);">
              <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Total Asistentes</div>
              <div style="font-size: 24px; font-weight: 700; color: #28a745;">${totalAsistentes}</div>
            </div>
            <div style="text-align: center; padding: 12px 16px; background: linear-gradient(135deg, rgba(128, 24, 54, 0.1) 0%, rgba(128, 24, 54, 0.05) 100%); border-radius: 8px; border-left: 3px solid #801836;">
              <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Tasa Asistencia</div>
              <div style="font-size: 24px; font-weight: 700; color: ${parseFloat(tasaAsistenciaGeneral) >= 80 ? '#28a745' : parseFloat(tasaAsistenciaGeneral) >= 60 ? '#ffc107' : '#dc3545'};">${tasaAsistenciaGeneral}%</div>
            </div>
          </div>
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
        <!-- Staff del Colegio -->
        <div style="background: linear-gradient(135deg, rgba(128, 24, 54, 0.1) 0%, rgba(128, 24, 54, 0.05) 100%); padding: 24px; border-radius: 12px; border-left: 4px solid #801836; box-shadow: 0 2px 8px rgba(128, 24, 54, 0.08);">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
            <i class="fas fa-school" style="font-size: 20px; color: #801836;"></i>
            <h5 style="color: #801836; font-size: 16px; font-weight: 700; margin: 0;">Staff del Colegio</h5>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div style="text-align: center; padding: 12px; background: rgba(128, 24, 54, 0.1); border-radius: 8px;">
              <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Acreditados</div>
              <div style="font-size: 28px; font-weight: 700; color: #801836;">${acreditadosStaff}</div>
            </div>
            <div style="text-align: center; padding: 12px; background: rgba(40, 167, 69, 0.1); border-radius: 8px;">
              <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Asistentes</div>
              <div style="font-size: 28px; font-weight: 700; color: #28a745;">${asistentesStaff}</div>
            </div>
          </div>
          <div style="margin-bottom: 12px;">
            <div style="font-size: 12px; color: #666; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
              <span><i class="fas fa-percentage" style="font-size: 10px; margin-right: 4px;"></i>Tasa de Asistencia</span>
              <span style="font-weight: 600; color: ${parseFloat(tasaAsistenciaStaff) >= 80 ? '#28a745' : parseFloat(tasaAsistenciaStaff) >= 60 ? '#ffc107' : '#dc3545'};">${tasaAsistenciaStaff}%</span>
            </div>
            <div style="height: 10px; background: rgba(128, 24, 54, 0.1); border-radius: 5px; overflow: hidden; position: relative; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);">
              <div style="height: 100%; width: 0%; background: linear-gradient(135deg, ${parseFloat(tasaAsistenciaStaff) >= 80 ? '#28a745' : parseFloat(tasaAsistenciaStaff) >= 60 ? '#ffc107' : '#dc3545'} 0%, #801836 100%); border-radius: 5px; transition: width 1s ease; box-shadow: 0 1px 4px rgba(0,0,0,0.2);" data-width="${tasaAsistenciaStaff}"></div>
            </div>
          </div>
          ${acreditadosStaff > asistentesStaff ? `
            <div style="font-size: 11px; color: #999; font-style: italic; margin-top: 8px;">
              ${acreditadosStaff - asistentesStaff} no asistieron
            </div>
          ` : ''}
        </div>
        
        <!-- Asistentes Externos -->
        <div style="background: linear-gradient(135deg, rgba(40, 167, 69, 0.1) 0%, rgba(40, 167, 69, 0.05) 100%); padding: 24px; border-radius: 12px; border-left: 4px solid #28a745; box-shadow: 0 2px 8px rgba(40, 167, 69, 0.08);">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
            <i class="fas fa-user-friends" style="font-size: 20px; color: #28a745;"></i>
            <h5 style="color: #28a745; font-size: 16px; font-weight: 700; margin: 0;">Asistentes Externos</h5>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div style="text-align: center; padding: 12px; background: rgba(128, 24, 54, 0.1); border-radius: 8px;">
              <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Acreditados</div>
              <div style="font-size: 28px; font-weight: 700; color: #801836;">${acreditadosNoStaff}</div>
            </div>
            <div style="text-align: center; padding: 12px; background: rgba(40, 167, 69, 0.1); border-radius: 8px;">
              <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Asistentes</div>
              <div style="font-size: 28px; font-weight: 700; color: #28a745;">${asistentesNoStaff}</div>
            </div>
          </div>
          <div style="margin-bottom: 12px;">
            <div style="font-size: 12px; color: #666; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
              <span><i class="fas fa-percentage" style="font-size: 10px; margin-right: 4px;"></i>Tasa de Asistencia</span>
              <span style="font-weight: 600; color: ${parseFloat(tasaAsistenciaNoStaff) >= 80 ? '#28a745' : parseFloat(tasaAsistenciaNoStaff) >= 60 ? '#ffc107' : '#dc3545'};">${tasaAsistenciaNoStaff}%</span>
            </div>
            <div style="height: 10px; background: rgba(40, 167, 69, 0.1); border-radius: 5px; overflow: hidden; position: relative; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);">
              <div style="height: 100%; width: 0%; background: linear-gradient(135deg, ${parseFloat(tasaAsistenciaNoStaff) >= 80 ? '#28a745' : parseFloat(tasaAsistenciaNoStaff) >= 60 ? '#ffc107' : '#dc3545'} 0%, #28a745 100%); border-radius: 5px; transition: width 1s ease 0.2s; box-shadow: 0 1px 4px rgba(0,0,0,0.2);" data-width="${tasaAsistenciaNoStaff}"></div>
            </div>
          </div>
          ${acreditadosNoStaff > asistentesNoStaff ? `
            <div style="font-size: 11px; color: #999; font-style: italic; margin-top: 8px;">
              ${acreditadosNoStaff - asistentesNoStaff} no asistieron
            </div>
          ` : ''}
        </div>
      </div>
      
      <div style="padding: 16px; background: linear-gradient(135deg, rgba(128, 24, 54, 0.05) 0%, rgba(128, 24, 54, 0.02) 100%); border-radius: 12px; border-left: 4px solid #801836; margin-top: 24px;">
        <div style="font-size: 13px; color: #666; line-height: 1.6;">
          <strong style="color: #801836;">Resumen:</strong> De los <strong>${totalAcreditados} inscritos</strong>, 
          <strong>${acreditadosStaff} son staff del colegio</strong> (${((acreditadosStaff / totalAcreditados) * 100).toFixed(1)}%) y 
          <strong>${acreditadosNoStaff} son asistentes externos</strong> (${((acreditadosNoStaff / totalAcreditados) * 100).toFixed(1)}%). 
          La tasa de asistencia general es del <strong>${tasaAsistenciaGeneral}%</strong>, con 
          <strong>${tasaAsistenciaStaff}%</strong> para staff y <strong>${tasaAsistenciaNoStaff}%</strong> para externos.
        </div>
      </div>
    </div>
  `;
  
  const wrapper = container.querySelector('.chart-wrapper');
  if (wrapper) {
    wrapper.innerHTML = html;
    // Animar las barras
    setTimeout(() => {
      wrapper.querySelectorAll('[data-width]').forEach(bar => {
        bar.style.width = bar.getAttribute('data-width') + '%';
      });
    }, 100);
  }
}

// Función para crear resumen visual de talleres
function createResumenTalleres(talleres1730, talleres1830) {
  const container = document.querySelector('#resumen-talleres');
  if (!container) return;
  
  const total1730 = Object.values(talleres1730).reduce((sum, val) => sum + val, 0);
  const total1830 = Object.values(talleres1830).reduce((sum, val) => sum + val, 0);
  const totalAsistentes = total1730 + total1830;
  const numTalleres1730 = Object.keys(talleres1730).length;
  const numTalleres1830 = Object.keys(talleres1830).length;
  const totalTalleres = numTalleres1730 + numTalleres1830;
  const promedioPorTaller = totalTalleres > 0 ? (totalAsistentes / totalTalleres).toFixed(1) : 0;
  
  // Taller más popular
  const tallerMasPopular1730 = Object.entries(talleres1730).sort((a, b) => b[1] - a[1])[0];
  const tallerMasPopular1830 = Object.entries(talleres1830).sort((a, b) => b[1] - a[1])[0];
  const tallerMasPopular = (tallerMasPopular1730?.[1] || 0) > (tallerMasPopular1830?.[1] || 0) 
    ? tallerMasPopular1730 
    : tallerMasPopular1830;
  
  let html = `
    <div style="margin-top: 20px; padding: 28px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(247, 245, 246, 0.95) 100%); border-radius: 16px; border: 1px solid rgba(128, 24, 54, 0.12); box-shadow: 0 4px 16px rgba(128, 24, 54, 0.08);">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 24px;">
        <div style="background: linear-gradient(135deg, rgba(128, 24, 54, 0.1) 0%, rgba(128, 24, 54, 0.05) 100%); padding: 20px; border-radius: 12px; border-left: 4px solid #801836; text-align: center; transition: all 0.3s;" onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 4px 12px rgba(128, 24, 54, 0.15)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
          <i class="fas fa-chalkboard-teacher" style="font-size: 2rem; color: #801836; margin-bottom: 12px; display: block;"></i>
          <div style="font-size: 32px; font-weight: 700; color: #801836; margin-bottom: 4px;">${totalTalleres}</div>
          <div style="font-size: 14px; color: #666;">Total Talleres</div>
          <div style="font-size: 12px; color: #999; margin-top: 8px;">${numTalleres1730} (17:30) + ${numTalleres1830} (18:30)</div>
        </div>
        
        <div style="background: linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 193, 7, 0.05) 100%); padding: 20px; border-radius: 12px; border-left: 4px solid #ffc107; text-align: center; transition: all 0.3s;" onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 4px 12px rgba(255, 193, 7, 0.15)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
          <i class="fas fa-chart-line" style="font-size: 2rem; color: #ffc107; margin-bottom: 12px; display: block;"></i>
          <div style="font-size: 32px; font-weight: 700; color: #ffc107; margin-bottom: 4px;">${promedioPorTaller}</div>
          <div style="font-size: 14px; color: #666;">Promedio Asistentes por Taller</div>
          <div style="font-size: 12px; color: #999; margin-top: 8px;">Asistentes promedio</div>
        </div>
      </div>
    </div>
  `;
  
  const wrapper = container.querySelector('.chart-wrapper');
  if (wrapper) {
    // Eliminar elementos de carga
    wrapper.querySelectorAll('.loading').forEach(el => el.remove());
    wrapper.innerHTML = html;
  } else {
    console.warn('createResumenTalleres: No se encontró .chart-wrapper');
  }
}

// Función para crear resumen visual de valoraciones
function createResumenValoracion(ratings, valoracionCharla) {
  const container = document.querySelector('#resumen-valoracion');
  if (!container) return;
  
  const totalRatings = Object.values(ratings).reduce((sum, val) => sum + val, 0);
  const promedioForo = totalRatings > 0 
    ? (Object.entries(ratings).reduce((sum, [v, c]) => sum + parseFloat(v) * c, 0) / totalRatings).toFixed(2)
    : 0;
  
  const totalCharla = Object.values(valoracionCharla).reduce((sum, val) => sum + val, 0);
  const promedioCharla = totalCharla > 0
    ? (Object.entries(valoracionCharla).reduce((sum, [v, c]) => sum + parseFloat(v) * c, 0) / totalCharla).toFixed(2)
    : 0;
  
  // Calcular % de satisfacción (4 y 5 estrellas)
  const satisfechosForo = Object.entries(ratings)
    .filter(([v]) => parseFloat(v) >= 4)
    .reduce((sum, [_, c]) => sum + c, 0);
  const porcentajeSatisfaccionForo = totalRatings > 0 ? ((satisfechosForo / totalRatings) * 100).toFixed(1) : 0;
  
  const satisfechosCharla = Object.entries(valoracionCharla)
    .filter(([v]) => parseFloat(v) >= 4)
    .reduce((sum, [_, c]) => sum + c, 0);
  const porcentajeSatisfaccionCharla = totalCharla > 0 ? ((satisfechosCharla / totalCharla) * 100).toFixed(1) : 0;
  
  let html = `
    <div style="margin-top: 20px; padding: 28px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(247, 245, 246, 0.95) 100%); border-radius: 16px; border: 1px solid rgba(128, 24, 54, 0.12); box-shadow: 0 4px 16px rgba(128, 24, 54, 0.08);">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
        <div style="background: linear-gradient(135deg, rgba(128, 24, 54, 0.1) 0%, rgba(128, 24, 54, 0.05) 100%); padding: 24px; border-radius: 12px; border-left: 4px solid #801836; text-align: center; transition: all 0.3s;" onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 4px 12px rgba(128, 24, 54, 0.15)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
          <i class="fas fa-star" style="font-size: 2.5rem; color: #ffd700; margin-bottom: 12px; display: block;"></i>
          <div style="font-size: 36px; font-weight: 700; color: #801836; margin-bottom: 8px;">${promedioForo}</div>
          <div style="font-size: 14px; color: #666; margin-bottom: 12px;">Valoración Media del Foro</div>
          <div style="display: flex; justify-content: center; gap: 4px; margin-bottom: 12px;">
            ${'<i class="fas fa-star" style="color: #ffd700; font-size: 18px;"></i>'.repeat(Math.round(parseFloat(promedioForo)))}
            ${'<i class="far fa-star" style="color: #ddd; font-size: 18px;"></i>'.repeat(5 - Math.round(parseFloat(promedioForo)))}
          </div>
          <div style="font-size: 12px; color: #999;">${totalRatings} valoraciones</div>
        </div>
        
        <div style="background: linear-gradient(135deg, rgba(40, 167, 69, 0.1) 0%, rgba(40, 167, 69, 0.05) 100%); padding: 24px; border-radius: 12px; border-left: 4px solid #28a745; text-align: center; transition: all 0.3s;" onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 4px 12px rgba(40, 167, 69, 0.15)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
          <i class="fas fa-smile" style="font-size: 2.5rem; color: #28a745; margin-bottom: 12px; display: block;"></i>
          <div style="font-size: 36px; font-weight: 700; color: #28a745; margin-bottom: 8px;">${porcentajeSatisfaccionForo}%</div>
          <div style="font-size: 14px; color: #666; margin-bottom: 12px;">Satisfacción del Foro</div>
          <div style="font-size: 12px; color: #999;">(4-5 estrellas)</div>
        </div>
        
        <div style="background: linear-gradient(135deg, rgba(128, 24, 54, 0.1) 0%, rgba(128, 24, 54, 0.05) 100%); padding: 24px; border-radius: 12px; border-left: 4px solid #801836; text-align: center; transition: all 0.3s;" onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 4px 12px rgba(128, 24, 54, 0.15)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
          <i class="fas fa-microphone-alt" style="font-size: 2.5rem; color: #801836; margin-bottom: 12px; display: block;"></i>
          <div style="font-size: 36px; font-weight: 700; color: #801836; margin-bottom: 8px;">${promedioCharla}</div>
          <div style="font-size: 14px; color: #666; margin-bottom: 12px;">Valoración Charla Inspiracional</div>
          <div style="display: flex; justify-content: center; gap: 4px; margin-bottom: 12px;">
            ${'<i class="fas fa-star" style="color: #ffd700; font-size: 18px;"></i>'.repeat(Math.round(parseFloat(promedioCharla)))}
            ${'<i class="far fa-star" style="color: #ddd; font-size: 18px;"></i>'.repeat(5 - Math.round(parseFloat(promedioCharla)))}
          </div>
          <div style="font-size: 12px; color: #999;">${totalCharla} valoraciones</div>
        </div>
        
        <div style="background: linear-gradient(135deg, rgba(40, 167, 69, 0.1) 0%, rgba(40, 167, 69, 0.05) 100%); padding: 24px; border-radius: 12px; border-left: 4px solid #28a745; text-align: center; transition: all 0.3s;" onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 4px 12px rgba(40, 167, 69, 0.15)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
          <i class="fas fa-heart" style="font-size: 2.5rem; color: #28a745; margin-bottom: 12px; display: block;"></i>
          <div style="font-size: 36px; font-weight: 700; color: #28a745; margin-bottom: 8px;">${porcentajeSatisfaccionCharla}%</div>
          <div style="font-size: 14px; color: #666; margin-bottom: 12px;">Satisfacción Charla</div>
          <div style="font-size: 12px; color: #999;">(4-5 estrellas)</div>
        </div>
      </div>
    </div>
  `;
  
  const wrapper = container.querySelector('.chart-wrapper');
  if (wrapper) {
    // Eliminar elementos de carga
    wrapper.querySelectorAll('.loading').forEach(el => el.remove());
    wrapper.innerHTML = html;
  } else {
    console.warn('createResumenValoracion: No se encontró .chart-wrapper');
  }
}

function createRatingChart(ratings) {
  const containers = document.querySelectorAll('#valoracion .chart-container');
  const container = Array.from(containers).find(c => !c.id || c.id !== 'resumen-valoracion');
  if (!container) return;
  
  const sortedRatings = Object.entries(ratings)
    .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
  
  const maxCount = Math.max(...Object.values(ratings), 1);
  const total = Object.values(ratings).reduce((sum, val) => sum + val, 0);
  const promedio = total > 0 
    ? (Object.entries(ratings).reduce((sum, [v, c]) => sum + parseFloat(v) * c, 0) / total).toFixed(2)
    : 0;
  
  // Calcular % de satisfacción (4 y 5 estrellas)
  const satisfechos = Object.entries(ratings)
    .filter(([v]) => parseFloat(v) >= 4)
    .reduce((sum, [_, c]) => sum + c, 0);
  const porcentajeSatisfaccion = total > 0 ? ((satisfechos / total) * 100).toFixed(1) : 0;
  
  // Crear gráfico de barras verticales mejorado con contexto
  let html = `
    <div style="margin-top: 20px; padding: 28px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(247, 245, 246, 0.95) 100%); border-radius: 16px; border: 1px solid rgba(128, 24, 54, 0.12); box-shadow: 0 4px 16px rgba(128, 24, 54, 0.08);">
      <div style="margin-bottom: 24px; padding-bottom: 20px; border-bottom: 2px solid rgba(128, 24, 54, 0.1);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
          <div>
            <h4 style="color: #801836; font-size: 18px; font-weight: 700; margin: 0 0 8px 0; display: flex; align-items: center; gap: 8px;">
              <i class="fas fa-star" style="font-size: 18px;"></i>
              Distribución de Valoraciones
            </h4>
            <p style="font-size: 13px; color: #666; margin: 0; line-height: 1.5;">
              Distribución de las valoraciones recibidas sobre el Foro de Innovación Educativa (escala 1-5 estrellas).
            </p>
          </div>
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <div style="text-align: center; padding: 10px 14px; background: rgba(128, 24, 54, 0.05); border-radius: 8px; border: 1px solid rgba(128, 24, 54, 0.1);">
              <div style="font-size: 10px; color: #666; margin-bottom: 4px;">Promedio</div>
              <div style="font-size: 20px; font-weight: 700; color: #801836;">${promedio}</div>
            </div>
            <div style="text-align: center; padding: 10px 14px; background: rgba(40, 167, 69, 0.05); border-radius: 8px; border: 1px solid rgba(40, 167, 69, 0.1);">
              <div style="font-size: 10px; color: #666; margin-bottom: 4px;">Satisfacción</div>
              <div style="font-size: 20px; font-weight: 700; color: #28a745;">${porcentajeSatisfaccion}%</div>
            </div>
            <div style="text-align: center; padding: 10px 14px; background: rgba(128, 24, 54, 0.05); border-radius: 8px; border: 1px solid rgba(128, 24, 54, 0.1);">
              <div style="font-size: 10px; color: #666; margin-bottom: 4px;">Total</div>
              <div style="font-size: 20px; font-weight: 700; color: #801836;">${total}</div>
            </div>
          </div>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 20px; align-items: end; min-height: 320px; margin-bottom: 24px;">
  `;
  
  sortedRatings.forEach(([rating, count], index) => {
    const porcentaje = maxCount > 0 ? ((count / maxCount) * 100) : 0;
    const height = maxCount > 0 ? (count / maxCount) * 250 : 0;
    const percentageOfTotal = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
    const colors = ['#801836', '#9a1f42', '#b4284e', '#ce315a', '#e83966'];
    const color = colors[parseInt(rating) - 1] || colors[0];
    
    html += `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
        <div style="position: relative; width: 100%; height: 280px; display: flex; align-items: flex-end; justify-content: center;">
          <div style="position: relative; width: 70px; height: 0%; background: linear-gradient(180deg, ${color} 0%, ${colors[Math.min(parseInt(rating), 4)]} 100%); border-radius: 8px 8px 0 0; transition: height 1s ease ${index * 0.15}s; box-shadow: 0 4px 12px rgba(128, 24, 54, 0.3);" data-height="${height}">
            <div style="position: absolute; top: -35px; left: 50%; transform: translateX(-50%); white-space: nowrap; font-weight: 700; font-size: 20px; color: ${color};">${count}</div>
          </div>
        </div>
        <div style="text-align: center;">
          <div style="display: flex; justify-content: center; gap: 4px; margin-bottom: 8px;">
            ${'<i class="fas fa-star" style="color: #ffd700; font-size: 18px;"></i>'.repeat(parseInt(rating))}
            ${'<i class="far fa-star" style="color: #ddd; font-size: 18px;"></i>'.repeat(5 - parseInt(rating))}
          </div>
          <div style="font-size: 16px; font-weight: 700; color: #801836; margin-bottom: 4px;">${rating}</div>
          <div style="font-size: 12px; color: #666;">${percentageOfTotal}%</div>
        </div>
      </div>
    `;
  });
  
  html += `
      </div>
      <div style="padding: 16px; background: linear-gradient(135deg, rgba(128, 24, 54, 0.05) 0%, rgba(128, 24, 54, 0.02) 100%); border-radius: 12px; border-left: 4px solid #801836; margin-top: 24px;">
        <div style="font-size: 13px; color: #666; line-height: 1.6;">
          <strong style="color: #801836;">Resumen:</strong> Se recibieron <strong>${total} valoraciones</strong> con un promedio de <strong>${promedio}/5</strong> estrellas. 
          El <strong>${porcentajeSatisfaccion}%</strong> de los encuestados calificó el foro con 4 o 5 estrellas (satisfacción alta).
          ${parseFloat(porcentajeSatisfaccion) >= 80 ? '⭐ Excelente nivel de satisfacción' : parseFloat(porcentajeSatisfaccion) >= 60 ? '👍 Buena satisfacción' : '📊 Hay margen de mejora'}
        </div>
      </div>
    </div>
  `;
  
  const wrapper = container.querySelector('.chart-wrapper');
  if (wrapper) {
    // Eliminar elementos de carga
    wrapper.querySelectorAll('.loading').forEach(el => el.remove());
    wrapper.innerHTML = html;
    // Animar las barras
    setTimeout(() => {
      wrapper.querySelectorAll('[data-height]').forEach(bar => {
        bar.style.height = bar.getAttribute('data-height') + 'px';
      });
    }, 100);
  } else {
    console.warn('createRatingChart: No se encontró .chart-wrapper');
  }
  
  // Create workshop rating charts
  createWorkshopRatings();
}

function createWorkshopRatings() {
  // Los talleres1730Ratings y talleres1830Ratings ya se calcularon en updateCharts
  // Solo necesitamos acceder a ellos desde el scope global o pasarlos como parámetros
  // Por ahora, los recalculamos aquí para mantener la funcionalidad
  const talleres1730Ratings = {};
  const talleres1830Ratings = {};
  
  // Función auxiliar para normalizar nombres de talleres
  function normalizarNombreTaller(taller) {
    if (!taller) return null;
    
    // Eliminar espacios al inicio y final
    let nombre = taller.trim();
    
    // Filtrar respuestas inválidas como "Sí", "No", etc.
    const respuestasInvalidas = ['sí', 'si', 'no', 'n/a', 'na', 'ninguno', 'ninguna', ''];
    if (respuestasInvalidas.includes(nombre.toLowerCase())) {
      return null;
    }
    
    // Extraer número y nombre (maneja "9. Nombre" y "9.Nombre")
    const match = nombre.match(/^(\d+)\.?\s*(.+)$/);
    if (match) {
      const numero = match[1];
      const resto = match[2].trim();
      // Validar que el resto no esté vacío
      if (!resto || resto.length < 2) {
        return null;
      }
      // Normalizar: siempre usar "numero. resto" con espacio
      return `${numero}. ${resto}`;
    }
    
    // Si no tiene formato de número, filtrarlo si es muy corto o es una respuesta inválida
    if (nombre.length < 3 || respuestasInvalidas.includes(nombre.toLowerCase())) {
      return null;
    }
    
    return nombre;
  }
  
  respuestasData.forEach(row => {
    // Intentar diferentes variaciones del nombre de la columna
    const taller1730 = row['¿A qué taller pudiste asistir a las 17.30 h?']?.trim() || 
                       row['¿A qué taller pudiste asistir a las 17.30 h? ']?.trim();
    let rating1730 = parseFloat(row['¿En qué grado recomendarías el taller al que asististe en la primera sesión?']);
    
    const taller1830 = row['¿A qué taller pudiste asistir a las 18.30 h?']?.trim() || 
                       row['¿A qué taller pudiste asistir a las 18.30 h? ']?.trim();
    let rating1830 = parseFloat(row['En qué grado recomendarías el taller al que asististe en la segunda sesión']);
    
    // Caso especial: si la valoración contiene texto que parece ser un nombre de taller (línea 34)
    // Extraer solo el número si es posible
    if (isNaN(rating1730) && row['¿En qué grado recomendarías el taller al que asististe en la primera sesión?']) {
      const valoracionTexto = row['¿En qué grado recomendarías el taller al que asististe en la primera sesión?'].trim();
      const numeroMatch = valoracionTexto.match(/^(\d+(?:\.\d+)?)/);
      if (numeroMatch) {
        rating1730 = parseFloat(numeroMatch[1]);
      }
    }
    
    if (isNaN(rating1830) && row['En qué grado recomendarías el taller al que asististe en la segunda sesión']) {
      const valoracionTexto = row['En qué grado recomendarías el taller al que asististe en la segunda sesión'].trim();
      const numeroMatch = valoracionTexto.match(/^(\d+(?:\.\d+)?)/);
      if (numeroMatch) {
        rating1830 = parseFloat(numeroMatch[1]);
      }
    }
    
    if (taller1730 && !isNaN(rating1730) && rating1730 > 0 && rating1730 <= 5) {
      const nombreTaller = normalizarNombreTaller(taller1730);
      if (nombreTaller) {
        if (!talleres1730Ratings[nombreTaller]) {
          talleres1730Ratings[nombreTaller] = { 
            total: 0, 
            count: 0, 
            ratings: [] // Guardar valoraciones individuales
          };
        }
        talleres1730Ratings[nombreTaller].total += rating1730;
        talleres1730Ratings[nombreTaller].count += 1;
        talleres1730Ratings[nombreTaller].ratings.push(rating1730);
      }
    }
    
    if (taller1830 && !isNaN(rating1830) && rating1830 > 0 && rating1830 <= 5) {
      const nombreTaller = normalizarNombreTaller(taller1830);
      if (nombreTaller) {
        if (!talleres1830Ratings[nombreTaller]) {
          talleres1830Ratings[nombreTaller] = { 
            total: 0, 
            count: 0, 
            ratings: [] // Guardar valoraciones individuales
          };
        }
        talleres1830Ratings[nombreTaller].total += rating1830;
        talleres1830Ratings[nombreTaller].count += 1;
        talleres1830Ratings[nombreTaller].ratings.push(rating1830);
      }
    }
  });
  
  // Calculate averages, satisfaction percentage, and breakdown
  const sorted1730 = Object.entries(talleres1730Ratings)
    .map(([taller, data]) => {
      const promedio = (data.total / data.count).toFixed(2);
      // Calcular % de satisfacción (4 y 5 estrellas)
      const satisfechos = data.ratings.filter(r => r >= 4).length;
      const porcentajeSatisfaccion = data.count > 0 ? ((satisfechos / data.count) * 100).toFixed(1) : 0;
      // Desglose por puntuación
      const desglose = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
      data.ratings.forEach(r => {
        const rating = Math.round(r);
        if (rating >= 1 && rating <= 5) {
          desglose[rating] = (desglose[rating] || 0) + 1;
        }
      });
      return [taller, promedio, data.count, porcentajeSatisfaccion, desglose, data];
    })
    .sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]));
  
  const sorted1830 = Object.entries(talleres1830Ratings)
    .map(([taller, data]) => {
      const promedio = (data.total / data.count).toFixed(2);
      // Calcular % de satisfacción (4 y 5 estrellas)
      const satisfechos = data.ratings.filter(r => r >= 4).length;
      const porcentajeSatisfaccion = data.count > 0 ? ((satisfechos / data.count) * 100).toFixed(1) : 0;
      // Desglose por puntuación
      const desglose = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
      data.ratings.forEach(r => {
        const rating = Math.round(r);
        if (rating >= 1 && rating <= 5) {
          desglose[rating] = (desglose[rating] || 0) + 1;
        }
      });
      return [taller, promedio, data.count, porcentajeSatisfaccion, desglose, data];
    })
    .sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]));
  
  // Debug logs
  console.log('Talleres 17:30:', sorted1730);
  console.log('Talleres 18:30:', sorted1830);
  
  // Función auxiliar para crear gráfico de valoraciones de talleres
  function createWorkshopRatingChart(sortedData, containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) {
      console.warn(`createWorkshopRatingChart: No se encontró ${containerSelector}`);
      return;
    }
    
    // Eliminar elementos de carga
    container.querySelectorAll('.loading').forEach(el => el.remove());
    
    let html = '<div style="display: grid; gap: 16px; margin-top: 20px;">';
    if (sortedData.length > 0) {
      const maxRating = Math.max(...sortedData.map(([_, p]) => parseFloat(p)), 5);
      const colors = ['#801836', '#9a1f42', '#b4284e', '#ce315a', '#e83966'];
      
      sortedData.forEach(([taller, promedio, count, porcentajeSatisfaccion, desglose, data], index) => {
        const numEstrellas = Math.round(parseFloat(promedio));
        const ratingValue = parseFloat(promedio);
        const ratingWidth = (ratingValue / maxRating) * 100;
        const color = colors[Math.min(numEstrellas - 1, 4)] || colors[0];
        const tallerEscapado = taller.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const tallerId = `taller-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Color para % de satisfacción
        const satisfaccionColor = parseFloat(porcentajeSatisfaccion) >= 80 ? '#28a745' : 
                                  parseFloat(porcentajeSatisfaccion) >= 60 ? '#ffc107' : '#dc3545';
        
        html += `
          <div style="background: rgba(247, 245, 246, 0.8); backdrop-filter: blur(10px); border: 1px solid rgba(128, 24, 54, 0.1); padding: 20px; border-radius: 12px; transition: all 0.3s; border-left: 4px solid ${color}; box-shadow: 0 2px 8px rgba(128, 24, 54, 0.05);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; gap: 16px;">
              <div style="flex: 1; min-width: 0;">
                <div style="font-size: 15px; font-weight: 600; color: #1a1a1a; line-height: 1.4; margin-bottom: 6px;">${tallerEscapado}</div>
                <div style="font-size: 12px; color: #666; font-style: italic; display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
                  <i class="fas fa-users" style="font-size: 11px;"></i>
                  ${count} ${count === 1 ? 'valoración' : 'valoraciones'}
                </div>
                <div style="display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: rgba(255, 255, 255, 0.6); border-radius: 8px; border: 1px solid ${satisfaccionColor}40;">
                  <i class="fas fa-smile" style="color: ${satisfaccionColor}; font-size: 14px;"></i>
                  <span style="font-size: 13px; color: #666;">Satisfacción: <strong style="color: ${satisfaccionColor};">${porcentajeSatisfaccion}%</strong> (4-5 estrellas)</span>
                </div>
              </div>
              <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex-shrink: 0;">
                <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
                  ${'<i class="fas fa-star" style="color: #ffd700; font-size: 16px; text-shadow: 0 1px 2px rgba(0,0,0,0.1);"></i>'.repeat(numEstrellas)}
                  ${'<i class="far fa-star" style="color: #ddd; font-size: 16px;"></i>'.repeat(5 - numEstrellas)}
                </div>
                <div style="background: linear-gradient(135deg, ${color} 0%, #801836 100%); color: white; padding: 8px 14px; border-radius: 12px; font-size: 24px; font-weight: 700; box-shadow: 0 2px 8px rgba(128, 24, 54, 0.3);">${promedio}</div>
              </div>
            </div>
            <div style="position: relative; height: 12px; background: rgba(128, 24, 54, 0.1); border-radius: 6px; overflow: hidden; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 12px;">
              <div style="position: absolute; left: 0; top: 0; height: 100%; width: 0%; background: linear-gradient(135deg, ${color} 0%, #801836 100%); border-radius: 6px; transition: width 1s ease ${index * 0.1}s; box-shadow: 0 1px 4px rgba(128, 24, 54, 0.3);" data-width="${ratingWidth}"></div>
            </div>
            <button onclick="toggleDesglose('${tallerId}')" style="width: 100%; padding: 10px; background: rgba(128, 24, 54, 0.05); border: 1px solid rgba(128, 24, 54, 0.2); border-radius: 8px; color: #801836; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; justify-content: center; gap: 8px;" onmouseover="this.style.background='rgba(128, 24, 54, 0.1)'" onmouseout="this.style.background='rgba(128, 24, 54, 0.05)'">
              <i class="fas fa-chart-bar" style="font-size: 12px;"></i>
              <span>Ver desglose de puntuaciones</span>
              <i class="fas fa-chevron-down" id="icon-${tallerId}" style="font-size: 10px; transition: transform 0.3s;"></i>
            </button>
            <div id="${tallerId}" style="display: none; margin-top: 12px; padding: 16px; background: rgba(255, 255, 255, 0.6); border-radius: 8px; border: 1px solid rgba(128, 24, 54, 0.1);">
              <h4 style="margin: 0 0 12px 0; color: #801836; font-size: 14px; font-weight: 700;">Distribución de Puntuaciones</h4>
              <div style="display: grid; gap: 10px;">
                ${[5, 4, 3, 2, 1].map(rating => {
                  const cantidad = desglose[rating] || 0;
                  const porcentaje = count > 0 ? ((cantidad / count) * 100).toFixed(1) : 0;
                  const maxCantidad = Math.max(...Object.values(desglose));
                  const barWidth = maxCantidad > 0 ? (cantidad / maxCantidad) * 100 : 0;
                  const ratingColor = rating >= 4 ? '#28a745' : rating >= 3 ? '#ffc107' : '#dc3545';
                  
                  return `
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <div style="flex: 0 0 80px; display: flex; align-items: center; gap: 6px;">
                        <div style="display: flex; gap: 2px;">
                          ${'<i class="fas fa-star" style="color: #ffd700; font-size: 12px;"></i>'.repeat(rating)}
                          ${'<i class="far fa-star" style="color: #ddd; font-size: 12px;"></i>'.repeat(5 - rating)}
                        </div>
                        <span style="font-size: 12px; color: #666; font-weight: 600;">${rating}</span>
                      </div>
                      <div style="flex: 1; position: relative; height: 24px; background: rgba(128, 24, 54, 0.1); border-radius: 4px; overflow: hidden;">
                        <div style="position: absolute; left: 0; top: 0; height: 100%; width: 0%; background: ${ratingColor}; border-radius: 4px; transition: width 0.8s ease; display: flex; align-items: center; justify-content: flex-end; padding-right: 8px;" data-width="${barWidth}">
                          <span style="color: white; font-size: 11px; font-weight: 700; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">${cantidad}</span>
                        </div>
                      </div>
                      <div style="flex: 0 0 60px; text-align: right; font-size: 12px; color: #666; font-weight: 600;">${porcentaje}%</div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        `;
      });
    } else {
      html += `<div style="text-align: center; padding: 40px; background: rgba(247, 245, 246, 0.5); border-radius: 12px; border: 2px dashed rgba(128, 24, 54, 0.2);">
        <i class="fas fa-info-circle" style="font-size: 2rem; color: #801836; margin-bottom: 12px; display: block;"></i>
        <p style="color: #666; font-size: 14px; margin: 0;">No hay datos disponibles</p>
      </div>`;
    }
    html += '</div>';
    container.innerHTML = html;
    
    // Animar las barras
    setTimeout(() => {
      container.querySelectorAll('[data-width]').forEach(bar => {
        bar.style.width = bar.getAttribute('data-width') + '%';
      });
    }, 100);
  }
  
  // Función global para toggle del desglose
  window.toggleDesglose = function(tallerId) {
    const desgloseDiv = document.getElementById(tallerId);
    const icon = document.getElementById(`icon-${tallerId}`);
    if (desgloseDiv && icon) {
      if (desgloseDiv.style.display === 'none') {
        desgloseDiv.style.display = 'block';
        icon.style.transform = 'rotate(180deg)';
        // Animar las barras del desglose
        setTimeout(() => {
          desgloseDiv.querySelectorAll('[data-width]').forEach(bar => {
            bar.style.width = bar.getAttribute('data-width') + '%';
          });
        }, 50);
      } else {
        desgloseDiv.style.display = 'none';
        icon.style.transform = 'rotate(0deg)';
      }
    }
  };
  
  // Display 17:30 ratings
  createWorkshopRatingChart(sorted1730, '#valoracion .grid-2 .chart-container:first-of-type .chart-wrapper');
  
  // Display 18:30 ratings
  createWorkshopRatingChart(sorted1830, '#valoracion .grid-2 .chart-container:last-of-type .chart-wrapper');
}

// Nueva función para gráfico de perfiles con gráfico de quesito
function createProfileChart(perfiles) {
  // Buscar el contenedor correcto - puede estar en diferentes posiciones
  const containers = document.querySelectorAll('#resumen .chart-container');
  let container = null;
  // Buscar uno que no tenga contenido específico o sea el último disponible
  for (let i = containers.length - 1; i >= 0; i--) {
    const c = containers[i];
    const h3 = c.querySelector('h3');
    if (h3 && (h3.textContent.includes('Perfil') || h3.textContent.includes('Encuestados'))) {
      container = c;
      break;
    }
  }
  // Si no se encuentra, usar el último
  if (!container && containers.length > 0) {
    container = containers[containers.length - 1];
  }
  if (!container) {
    console.warn('createProfileChart: No se encontró el contenedor');
    return;
  }
  
  const sorted = Object.entries(perfiles).sort((a, b) => b[1] - a[1]);
  const total = Object.values(perfiles).reduce((sum, val) => sum + val, 0);
  const maxCount = Math.max(...Object.values(perfiles), 1);
  const colors = ['#801836', '#9a1f42', '#b4284e', '#ce315a', '#e83966'];
  
  if (sorted.length === 0) return;
  
  // Crear gráfico de quesito SVG - Corregido
  const radius = 70;
  const centerX = 100;
  const centerY = 100;
  let currentAngle = -90; // Empezar desde arriba
  
  const pieSegments = sorted.map(([perfil, count], index) => {
    const percentage = (count / total) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;
    
    // Convertir ángulos a radianes
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;
    
    // Calcular puntos para el arco
    const x1 = centerX + radius * Math.cos(startAngleRad);
    const y1 = centerY + radius * Math.sin(startAngleRad);
    const x2 = centerX + radius * Math.cos(endAngleRad);
    const y2 = centerY + radius * Math.sin(endAngleRad);
    
    // Large arc flag (1 si el ángulo es > 180)
    const largeArcFlag = angle > 180 ? 1 : 0;
    
    return {
      percentage: percentage.toFixed(1),
      startAngle: startAngle,
      endAngle: endAngle,
      angle: angle,
      x1: x1,
      y1: y1,
      x2: x2,
      y2: y2,
      largeArcFlag: largeArcFlag,
      color: colors[index % colors.length],
      perfil: perfil,
      count: count,
      index: index
    };
  });
  
  let html = `
    <div style="margin-top: 30px; padding-top: 30px; border-top: 2px solid rgba(128, 24, 54, 0.1);">
      <h4 style="color: #801836; font-size: 18px; font-weight: 700; margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
        <i class="fas fa-users" style="font-size: 18px;"></i>
        Perfil de Encuestados
      </h4>
      <div style="display: grid; grid-template-columns: 1fr 1.5fr; gap: 24px; align-items: start;">
        <div style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(247, 245, 246, 0.95) 100%); padding: 24px; border-radius: 16px; border: 1px solid rgba(128, 24, 54, 0.12); box-shadow: 0 4px 16px rgba(128, 24, 54, 0.08);">
          <div style="position: relative; width: 100%; max-width: 250px; margin: 0 auto;">
            <svg viewBox="0 0 200 200" style="width: 100%; height: auto;">
              ${pieSegments.map(segment => `
                <path
                  d="M ${centerX} ${centerY} L ${segment.x1} ${segment.y1} A ${radius} ${radius} 0 ${segment.largeArcFlag} 1 ${segment.x2} ${segment.y2} Z"
                  fill="${segment.color}"
                  stroke="white"
                  stroke-width="2"
                  style="opacity: 0; transition: opacity 0.5s ease ${segment.index * 0.1}s;"
                  data-segment-index="${segment.index}"
                />
              `).join('')}
              <circle
                cx="${centerX}"
                cy="${centerY}"
                r="${radius - 30}"
                fill="white"
              />
            </svg>
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; pointer-events: none;">
              <div style="font-size: 28px; font-weight: 700; color: #801836;">${total}</div>
              <div style="font-size: 11px; color: #666;">encuestados</div>
            </div>
          </div>
        </div>
        <div style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(247, 245, 246, 0.95) 100%); padding: 24px; border-radius: 16px; border: 1px solid rgba(128, 24, 54, 0.12); box-shadow: 0 4px 16px rgba(128, 24, 54, 0.08);">
          <div style="display: flex; flex-direction: column; gap: 14px;">
            ${pieSegments.map((segment, index) => {
              const porcentaje = maxCount > 0 ? (segment.count / maxCount) * 100 : 0;
              return `
                <div style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(247, 245, 246, 0.9) 100%); padding: 16px; border-radius: 12px; border-left: 4px solid ${segment.color}; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; box-shadow: 0 2px 8px rgba(128, 24, 54, 0.06);" onmouseover="this.style.transform='translateX(6px)'; this.style.boxShadow='0 4px 16px rgba(128, 24, 54, 0.15)'; this.style.background='linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(247, 245, 246, 1) 100%)'" onmouseout="this.style.transform='translateX(0)'; this.style.boxShadow='0 2px 8px rgba(128, 24, 54, 0.06)'; this.style.background='linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(247, 245, 246, 0.9) 100%)'">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <div style="width: 20px; height: 20px; background: linear-gradient(135deg, ${segment.color} 0%, ${colors[(index + 1) % colors.length]} 100%); border-radius: 6px; flex-shrink: 0; box-shadow: 0 2px 6px rgba(128, 24, 54, 0.2);"></div>
                      <span style="font-weight: 600; color: #1a1a1a; font-size: 15px; letter-spacing: 0.2px;">${segment.perfil}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <span style="background: linear-gradient(135deg, ${segment.color} 0%, ${colors[(index + 1) % colors.length]} 100%); color: white; padding: 6px 12px; border-radius: 12px; font-size: 14px; font-weight: 700; box-shadow: 0 2px 8px rgba(128, 24, 54, 0.3);">${segment.count}</span>
                      <span style="color: ${segment.color}; font-size: 13px; font-weight: 600; background: rgba(128, 24, 54, 0.08); padding: 4px 10px; border-radius: 12px;">${segment.percentage}%</span>
                    </div>
                  </div>
                  <div style="height: 10px; background: rgba(128, 24, 54, 0.1); border-radius: 6px; overflow: hidden; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);">
                    <div style="height: 100%; width: 0%; background: linear-gradient(135deg, ${segment.color} 0%, ${colors[(index + 1) % colors.length]} 100%); border-radius: 6px; transition: width 1s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.1}s; box-shadow: 0 1px 4px rgba(128, 24, 54, 0.3);" data-width="${porcentaje}"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
  
  const wrapper = container.querySelector('.chart-wrapper');
  if (wrapper) {
    // Eliminar elementos de carga
    wrapper.querySelectorAll('.loading').forEach(el => el.remove());
    wrapper.innerHTML = wrapper.innerHTML + html;
    // Animar el gráfico de quesito y las barras
    setTimeout(() => {
      wrapper.querySelectorAll('path[data-segment-index]').forEach(path => {
        path.style.opacity = '1';
      });
      wrapper.querySelectorAll('[data-width]').forEach(bar => {
        bar.style.width = bar.getAttribute('data-width') + '%';
      });
    }, 100);
  } else {
    console.warn('createProfileChart: No se encontró .chart-wrapper');
  }
}

// Nueva función para gráfico de fuentes de información con barras horizontales mejoradas
function createSourceChart(fuentes) {
  // Buscar el contenedor correcto
  const containers = document.querySelectorAll('#resumen .chart-container');
  let container = null;
  // Buscar uno que no tenga contenido específico o sea el último disponible
  for (let i = containers.length - 1; i >= 0; i--) {
    const c = containers[i];
    const h3 = c.querySelector('h3');
    if (h3 && (h3.textContent.includes('Fuentes') || h3.textContent.includes('enteraste'))) {
      container = c;
      break;
    }
  }
  // Si no se encuentra, usar el último
  if (!container && containers.length > 0) {
    container = containers[containers.length - 1];
  }
  if (!container) {
    console.warn('createSourceChart: No se encontró el contenedor');
    return;
  }
  
  const sorted = Object.entries(fuentes).sort((a, b) => b[1] - a[1]);
  const maxCount = Math.max(...Object.values(fuentes), 1);
  const total = Object.values(fuentes).reduce((sum, val) => sum + val, 0);
  const colors = ['#801836', '#9a1f42', '#b4284e', '#ce315a', '#e83966'];
  const icons = {
    'Comunicación del centro donde trabajo': 'fa-building',
    'Invitación directa vía email': 'fa-envelope',
    'Página web del Colegio Santa María la Blanca': 'fa-globe',
    'Redes sociales (Linkedin, Instagram, ...)': 'fa-share-alt',
    'Recomendación de un compañero, amigo, conocido...': 'fa-user-friends',
    'Otros': 'fa-ellipsis-h'
  };
  
  if (sorted.length === 0) return;
  
  let html = `
    <div style="margin-top: 30px; padding-top: 30px; border-top: 2px solid rgba(128, 24, 54, 0.1);">
      <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid rgba(128, 24, 54, 0.1);">
        <h4 style="color: #801836; font-size: 18px; font-weight: 700; margin: 0 0 8px 0; display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-bullhorn" style="font-size: 18px;"></i>
          ¿Cómo se enteraron del evento?
        </h4>
        <p style="font-size: 13px; color: #666; margin: 0; line-height: 1.5;">
          Análisis de las fuentes de información que utilizaron los participantes para conocer el evento. Esto ayuda a evaluar la efectividad de las estrategias de comunicación y difusión.
        </p>
      </div>
      <div style="display: flex; flex-direction: column; gap: 16px;">
  `;
  
  sorted.forEach(([fuente, count], index) => {
    const porcentaje = maxCount > 0 ? (count / maxCount) * 100 : 0;
    const percentageOfTotal = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
    const color = colors[index % colors.length];
    const icon = icons[fuente] || 'fa-info-circle';
    
    html += `
      <div style="background: rgba(247, 245, 246, 0.8); backdrop-filter: blur(10px); border: 1px solid rgba(128, 24, 54, 0.1); padding: 18px; border-radius: 12px; border-left: 4px solid ${color}; transition: all 0.3s; cursor: pointer; box-shadow: 0 2px 8px rgba(128, 24, 54, 0.05);" onmouseover="this.style.transform='translateX(5px)'; this.style.boxShadow='0 4px 12px rgba(128, 24, 54, 0.15)'" onmouseout="this.style.transform='translateX(0)'; this.style.boxShadow='0 2px 8px rgba(128, 24, 54, 0.05)'">
        <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 12px;">
          <div style="flex: 0 0 200px; min-width: 0; display: flex; align-items: center; gap: 10px;">
            <i class="fas ${icon}" style="color: ${color}; font-size: 18px; flex-shrink: 0;"></i>
            <span style="font-weight: 600; color: #1a1a1a; font-size: 14px; line-height: 1.3;">${fuente}</span>
          </div>
          <div style="flex: 1; position: relative;">
            <div style="position: relative; height: 32px; background: rgba(128, 24, 54, 0.1); border-radius: 8px; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);">
              <div style="position: absolute; left: 0; top: 0; height: 100%; width: 0%; background: linear-gradient(135deg, ${color} 0%, #801836 100%); border-radius: 8px; transition: width 1s ease ${index * 0.1}s; display: flex; align-items: center; justify-content: flex-end; padding-right: 12px; box-shadow: 0 2px 8px rgba(128, 24, 54, 0.3);" data-width="${porcentaje}">
                <span style="color: white; font-weight: 700; font-size: 13px; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">${count}</span>
              </div>
            </div>
          </div>
          <div style="flex: 0 0 100px; text-align: right;">
            <div style="font-size: 16px; font-weight: 700; color: ${color}; margin-bottom: 2px;">${count}</div>
            <div style="font-size: 11px; color: #666;">${percentageOfTotal}%</div>
          </div>
        </div>
      </div>
    `;
  });
  
  html += '</div></div>';
  
  const wrapper = container.querySelector('.chart-wrapper');
  if (wrapper) {
    // Eliminar elementos de carga
    wrapper.querySelectorAll('.loading').forEach(el => el.remove());
    wrapper.innerHTML = wrapper.innerHTML + html;
    // Animar las barras
    setTimeout(() => {
      wrapper.querySelectorAll('[data-width]').forEach(bar => {
        bar.style.width = bar.getAttribute('data-width') + '%';
      });
    }, 100);
  } else {
    console.warn('createSourceChart: No se encontró .chart-wrapper');
  }
}

// Función para analizar datos de inscripciones
function createInscripcionesAnalysis() {
  const container = document.querySelector('#inscripciones-analysis');
  if (!container) {
    console.warn('createInscripcionesAnalysis: No se encontró #inscripciones-analysis');
    return;
  }
  
  container.style.display = 'block';
  const wrapper = container.querySelector('.chart-wrapper');
  if (!wrapper) {
    console.warn('createInscripcionesAnalysis: No se encontró .chart-wrapper');
    return;
  }
  
  // Eliminar elementos de carga
  wrapper.querySelectorAll('.loading').forEach(el => el.remove());
  
  // Análisis de perfiles de inscripción
  const perfilesInscripcion = {};
  const estadosInscripcion = {};
  const instituciones = {};
  const inscripcionesPorFecha = {};
  const talleresPorPerfil = {};
  const comunicacionDigital = { acepta: 0, noAcepta: 0 };
  
  // Mapa para cruzar datos: email -> datos de inscripción
  const inscripcionesPorEmail = {};
  
  inscripcionesData.forEach(row => {
    // Perfil
    const perfil = row['Me inscribo como']?.trim() || 'Sin especificar';
    perfilesInscripcion[perfil] = (perfilesInscripcion[perfil] || 0) + 1;
    
    // Estado
    const estado = row.Estado?.trim() || 'Sin especificar';
    estadosInscripcion[estado] = (estadosInscripcion[estado] || 0) + 1;
    
    // Guardar datos por email para cruzar con asistencia
    const email = row.Email?.trim()?.toLowerCase();
    
    // Institución (normalizada) - usar email si la institución está vacía
    const institucion = row['Institución a la que perteneces']?.trim();
    const institucionNormalizada = normalizarInstitucion(institucion, email);
    if (institucionNormalizada && institucionNormalizada !== '') {
      instituciones[institucionNormalizada] = (instituciones[institucionNormalizada] || 0) + 1;
    }
    
    if (email) {
      inscripcionesPorEmail[email] = {
        perfil: perfil,
        institucion: institucionNormalizada || '',
        estado: estado,
        nombre: `${row.Nombre || ''} ${row.Apellidos || ''}`.trim()
      };
    }
    
    // Fecha de inscripción
    const fecha = row['Fecha de inscripción']?.trim();
    if (fecha) {
      inscripcionesPorFecha[fecha] = (inscripcionesPorFecha[fecha] || 0) + 1;
    }
    
    // Talleres por perfil
    const taller1730 = row['¿En qué taller quiero apuntarme a las 17:30 – 18:15 h?']?.trim();
    const taller1830 = row['¿En qué taller quiero apuntarme a las 18:30 – 19:15 h?']?.trim();
    
    if (taller1730 && taller1730 !== '') {
      if (!talleresPorPerfil[perfil]) talleresPorPerfil[perfil] = {};
      const nombreTaller = extractTallerName(taller1730);
      talleresPorPerfil[perfil][nombreTaller] = (talleresPorPerfil[perfil][nombreTaller] || 0) + 1;
    }
    if (taller1830 && taller1830 !== '') {
      if (!talleresPorPerfil[perfil]) talleresPorPerfil[perfil] = {};
      const nombreTaller = extractTallerName(taller1830);
      talleresPorPerfil[perfil][nombreTaller] = (talleresPorPerfil[perfil][nombreTaller] || 0) + 1;
    }
    
    // Comunicación digital
    const comDigital = row['Comunicación digital']?.trim();
    if (comDigital && comDigital.includes('interesado')) {
      comunicacionDigital.acepta++;
    } else {
      comunicacionDigital.noAcepta++;
    }
  });
  
  // Cruzar datos: Inscritos vs Asistentes
  const analisisCruzado = {
    porPerfil: {},
    porRol: {},
    porInstitucion: {},
    porTipoDocente: {
      docentesColegio: { inscritos: 0, acreditados: 0, asistentes: 0 },
      docentesExternos: { inscritos: 0, acreditados: 0, asistentes: 0 },
      noDocentes: { inscritos: 0, acreditados: 0, asistentes: 0 }
    },
    totalInscritos: inscripcionesData.length,
    totalAsistentes: 0,
    totalAcreditados: acreditacionesData.length
  };
  
  // Mapa de emails de acreditaciones y asistencia para cruzar
  const acreditadosPorEmail = {};
  const asistentesPorEmail = {};
  
  // Procesar acreditaciones
  acreditacionesData.forEach(row => {
    const email = row.Email?.trim()?.toLowerCase();
    const rol = row.Rol?.trim() || 'Sin especificar';
    
    if (!analisisCruzado.porRol[rol]) {
      analisisCruzado.porRol[rol] = { acreditados: 0, asistentes: 0, inscritos: 0 };
    }
    analisisCruzado.porRol[rol].acreditados++;
    
    if (email) {
      acreditadosPorEmail[email] = { rol: rol };
    }
  });
  
  // Procesar asistencia (solo con talleres)
  const asistenciaConTalleres = asistenciaData.filter(row => {
    const taller1730 = row['17:30']?.trim();
    const taller1830 = row['18:30']?.trim();
    return (taller1730 && taller1730 !== '' && taller1730 !== 'Primera sesión') ||
           (taller1830 && taller1830 !== '' && taller1830 !== 'Segunda sesión');
  });
  
  asistenciaConTalleres.forEach(row => {
    const email = row.Email?.trim()?.toLowerCase();
    const rol = row.Rol?.trim() || 'Sin especificar';
    
    analisisCruzado.totalAsistentes++;
    
    if (!analisisCruzado.porRol[rol]) {
      analisisCruzado.porRol[rol] = { acreditados: 0, asistentes: 0, inscritos: 0 };
    }
    analisisCruzado.porRol[rol].asistentes++;
    
    if (email) {
      asistentesPorEmail[email] = { rol: rol };
    }
  });
  
  // Procesar inscripciones y cruzar con acreditaciones y asistencia
  inscripcionesData.forEach(row => {
    const email = row.Email?.trim()?.toLowerCase();
    const perfil = row['Me inscribo como']?.trim() || 'Sin especificar';
    const institucion = row['Institución a la que perteneces']?.trim();
    const institucionNormalizada = normalizarInstitucion(institucion, email);
    const esDocente = esDocenteColegio(email);
    const esDocentePerfil = perfil.toLowerCase().includes('docente') || perfil.toLowerCase().includes('profesor');
    
    // Identificar tipo de docente
    let tipoDocente = 'noDocentes';
    if (esDocente) {
      tipoDocente = 'docentesColegio';
    } else if (esDocentePerfil) {
      tipoDocente = 'docentesExternos';
    }
    
    // Contar por tipo de docente
    analisisCruzado.porTipoDocente[tipoDocente].inscritos++;
    if (email && acreditadosPorEmail[email]) {
      analisisCruzado.porTipoDocente[tipoDocente].acreditados++;
    }
    if (email && asistentesPorEmail[email]) {
      analisisCruzado.porTipoDocente[tipoDocente].asistentes++;
    }
    
    // Contar por perfil
    if (!analisisCruzado.porPerfil[perfil]) {
      analisisCruzado.porPerfil[perfil] = { inscritos: 0, acreditados: 0, asistentes: 0, docentesColegio: 0 };
    }
    analisisCruzado.porPerfil[perfil].inscritos++;
    if (esDocente) {
      analisisCruzado.porPerfil[perfil].docentesColegio++;
    }
    
    // Verificar si está acreditado
    if (email && acreditadosPorEmail[email]) {
      analisisCruzado.porPerfil[perfil].acreditados++;
    }
    
    // Verificar si asistió
    if (email && asistentesPorEmail[email]) {
      analisisCruzado.porPerfil[perfil].asistentes++;
    }
    
    // Contar por institución
    if (institucionNormalizada) {
      if (!analisisCruzado.porInstitucion[institucionNormalizada]) {
        analisisCruzado.porInstitucion[institucionNormalizada] = { inscritos: 0, acreditados: 0, asistentes: 0, docentesColegio: 0 };
      }
      analisisCruzado.porInstitucion[institucionNormalizada].inscritos++;
      if (esDocente) {
        analisisCruzado.porInstitucion[institucionNormalizada].docentesColegio++;
      }
      
      if (email && acreditadosPorEmail[email]) {
        analisisCruzado.porInstitucion[institucionNormalizada].acreditados++;
      }
      
      if (email && asistentesPorEmail[email]) {
        analisisCruzado.porInstitucion[institucionNormalizada].asistentes++;
      }
    }
    
    // Contar inscritos por rol (si está en acreditaciones)
    if (email && acreditadosPorEmail[email]) {
      const rol = acreditadosPorEmail[email].rol;
      analisisCruzado.porRol[rol].inscritos++;
    }
  });
  
  const totalInscripciones = inscripcionesData.length;
  const perfilesOrdenados = Object.entries(perfilesInscripcion).sort((a, b) => b[1] - a[1]);
  const estadosOrdenados = Object.entries(estadosInscripcion).sort((a, b) => b[1] - a[1]);
  // Las instituciones ya están normalizadas (usando normalizarInstitucion) en el procesamiento anterior
  // Esto unifica: "Sta. María La Blanca", "Escuelita", "Secundaria", "ESO" → "Colegio Santa María la Blanca"
  // Y "Camb" → "CSMB"
  const institucionesOrdenadas = Object.entries(instituciones).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const fechasOrdenadas = Object.entries(inscripcionesPorFecha).sort((a, b) => a[0].localeCompare(b[0]));
  
  const colors = ['#801836', '#9a1f42', '#b4284e', '#ce315a', '#e83966'];
  
  let html = `
    <div style="margin-top: 20px; padding: 28px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(247, 245, 246, 0.95) 100%); border-radius: 16px; border: 1px solid rgba(128, 24, 54, 0.12); box-shadow: 0 4px 16px rgba(128, 24, 54, 0.08);">
      <h4 style="margin: 0 0 24px 0; color: #801836; font-size: 20px; font-weight: 700; display: flex; align-items: center; gap: 10px;">
        <i class="fas fa-user-plus" style="font-size: 22px;"></i>
        Análisis de Inscripciones (${totalInscripciones} total)
      </h4>
      
      <!-- Distribución por Perfil -->
      <div style="margin-bottom: 32px;">
        <h5 style="color: #801836; font-size: 16px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-users" style="font-size: 16px;"></i>
          Distribución por Perfil de Inscripción
        </h5>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
  `;
  
  perfilesOrdenados.forEach(([perfil, count], index) => {
    const porcentaje = totalInscripciones > 0 ? ((count / totalInscripciones) * 100).toFixed(1) : 0;
    const color = colors[index % colors.length];
    
    html += `
      <div style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(247, 245, 246, 0.9) 100%); padding: 20px; border-radius: 12px; border-left: 4px solid ${color}; box-shadow: 0 2px 8px rgba(128, 24, 54, 0.08); transition: all 0.3s;" onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 4px 12px rgba(128, 24, 54, 0.15)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(128, 24, 54, 0.08)'">
        <div style="font-size: 13px; color: #666; margin-bottom: 8px;">${perfil}</div>
        <div style="font-size: 28px; font-weight: 700; color: ${color}; margin-bottom: 4px;">${count}</div>
        <div style="font-size: 12px; color: #666;">${porcentaje}%</div>
      </div>
    `;
  });
  
  html += `
        </div>
      </div>
      
      <!-- Estados de Inscripción -->
      <div style="margin-bottom: 32px; padding-top: 24px; border-top: 2px solid rgba(128, 24, 54, 0.1);">
        <h5 style="color: #801836; font-size: 16px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-check-circle" style="font-size: 16px;"></i>
          Estados de Inscripción
        </h5>
        <div style="display: flex; gap: 20px; flex-wrap: wrap;">
  `;
  
  estadosOrdenados.forEach(([estado, count], index) => {
    const porcentaje = totalInscripciones > 0 ? ((count / totalInscripciones) * 100).toFixed(1) : 0;
    const color = estado === 'Confirmado' ? '#28a745' : estado === 'Lista de Espera' ? '#ffc107' : colors[index % colors.length];
    
    html += `
      <div style="flex: 1; min-width: 150px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(247, 245, 246, 0.9) 100%); padding: 18px; border-radius: 12px; border: 2px solid ${color}; text-align: center; box-shadow: 0 2px 8px rgba(128, 24, 54, 0.08);">
        <div style="font-size: 24px; font-weight: 700; color: ${color}; margin-bottom: 8px;">${count}</div>
        <div style="font-size: 13px; color: #666; margin-bottom: 4px;">${estado}</div>
        <div style="font-size: 11px; color: #999;">${porcentaje}%</div>
      </div>
    `;
  });
  
  html += `
        </div>
      </div>
      
      <!-- Comunicación Digital -->
      <div style="margin-bottom: 32px; padding-top: 24px; border-top: 2px solid rgba(128, 24, 54, 0.1);">
        <h5 style="color: #801836; font-size: 16px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-envelope" style="font-size: 16px;"></i>
          Interés en Comunicación Digital
        </h5>
        <div style="display: flex; gap: 20px;">
          <div style="flex: 1; background: linear-gradient(135deg, rgba(40, 167, 69, 0.1) 0%, rgba(40, 167, 69, 0.05) 100%); padding: 20px; border-radius: 12px; border-left: 4px solid #28a745; text-align: center;">
            <div style="font-size: 32px; font-weight: 700; color: #28a745; margin-bottom: 8px;">${comunicacionDigital.acepta}</div>
            <div style="font-size: 14px; color: #666;">Interesados en recibir comunicaciones</div>
            <div style="font-size: 12px; color: #999; margin-top: 4px;">${totalInscripciones > 0 ? ((comunicacionDigital.acepta / totalInscripciones) * 100).toFixed(1) : 0}%</div>
          </div>
          <div style="flex: 1; background: linear-gradient(135deg, rgba(128, 24, 54, 0.1) 0%, rgba(128, 24, 54, 0.05) 100%); padding: 20px; border-radius: 12px; border-left: 4px solid #801836; text-align: center;">
            <div style="font-size: 32px; font-weight: 700; color: #801836; margin-bottom: 8px;">${comunicacionDigital.noAcepta}</div>
            <div style="font-size: 14px; color: #666;">No interesados</div>
            <div style="font-size: 12px; color: #999; margin-top: 4px;">${totalInscripciones > 0 ? ((comunicacionDigital.noAcepta / totalInscripciones) * 100).toFixed(1) : 0}%</div>
          </div>
        </div>
      </div>
      
      <!-- Top Instituciones -->
      <div style="margin-bottom: 32px; padding-top: 24px; border-top: 2px solid rgba(128, 24, 54, 0.1);">
        <h5 style="color: #801836; font-size: 16px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-building" style="font-size: 16px;"></i>
          Top 10 Instituciones Más Representadas
        </h5>
        <div style="display: flex; flex-direction: column; gap: 12px;">
  `;
  
  institucionesOrdenadas.forEach(([institucion, count], index) => {
    const porcentaje = totalInscripciones > 0 ? ((count / totalInscripciones) * 100).toFixed(1) : 0;
    const maxCount = Math.max(...institucionesOrdenadas.map(([_, c]) => c), 1);
    const porcentajeBarra = (count / maxCount) * 100;
    const color = colors[index % colors.length];
    
    html += `
      <div style="background: rgba(247, 245, 246, 0.8); padding: 14px; border-radius: 10px; border-left: 4px solid ${color}; display: flex; align-items: center; gap: 16px;">
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: 600; color: #1a1a1a; font-size: 14px; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${institucion}</div>
          <div style="height: 8px; background: rgba(128, 24, 54, 0.1); border-radius: 4px; overflow: hidden;">
            <div style="height: 100%; width: 0%; background: linear-gradient(135deg, ${color} 0%, #801836 100%); border-radius: 4px; transition: width 1s ease ${index * 0.1}s;" data-width="${porcentajeBarra}"></div>
          </div>
        </div>
        <div style="flex: 0 0 80px; text-align: right;">
          <div style="font-size: 18px; font-weight: 700; color: ${color};">${count}</div>
          <div style="font-size: 11px; color: #666;">${porcentaje}%</div>
        </div>
      </div>
    `;
  });
  
  html += `
        </div>
      </div>
      
      <!-- Análisis Cruzado: Inscritos vs Asistentes por Perfil -->
      <div style="margin-bottom: 32px; padding-top: 24px; border-top: 2px solid rgba(128, 24, 54, 0.1);">
        <h5 style="color: #801836; font-size: 16px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-exchange-alt" style="font-size: 16px;"></i>
          Análisis Cruzado: Inscritos vs Asistentes por Perfil
        </h5>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
  `;
  
  const perfilesCruzados = Object.entries(analisisCruzado.porPerfil).sort((a, b) => b[1].inscritos - a[1].inscritos);
  perfilesCruzados.forEach(([perfil, datos], index) => {
    const tasaAsistencia = datos.inscritos > 0 ? ((datos.asistentes / datos.inscritos) * 100).toFixed(1) : 0;
    const tasaAcreditacion = datos.inscritos > 0 ? ((datos.acreditados / datos.inscritos) * 100).toFixed(1) : 0;
    const color = colors[index % colors.length];
    const docentesColegioCount = datos.docentesColegio || 0;
    const badgeDocentes = docentesColegioCount > 0 ? `<span style="background: linear-gradient(135deg, #801836 0%, #9a1f42 100%); color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; margin-left: 8px;" title="${docentesColegioCount} docentes del colegio">🏫 ${docentesColegioCount}</span>` : '';
    
    html += `
      <div style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(247, 245, 246, 0.9) 100%); padding: 20px; border-radius: 12px; border-left: 4px solid ${color}; box-shadow: 0 2px 8px rgba(128, 24, 54, 0.08); transition: all 0.3s;" onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 4px 12px rgba(128, 24, 54, 0.15)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(128, 24, 54, 0.08)'">
        <div style="font-size: 15px; font-weight: 700; color: #801836; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <i class="fas fa-user" style="font-size: 16px; color: ${color};"></i>
          <span>${perfil}</span>
          ${badgeDocentes}
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 12px;">
          <div style="text-align: center; padding: 12px; background: linear-gradient(135deg, rgba(255, 193, 7, 0.15) 0%, rgba(255, 193, 7, 0.08) 100%); border-radius: 8px; border: 1px solid rgba(255, 193, 7, 0.3);">
            <div style="font-size: 10px; color: #666; margin-bottom: 4px; font-weight: 600;">Inscritos</div>
            <div style="font-size: 22px; font-weight: 700; color: #ffc107;">${datos.inscritos}</div>
          </div>
          <div style="text-align: center; padding: 12px; background: linear-gradient(135deg, rgba(128, 24, 54, 0.15) 0%, rgba(128, 24, 54, 0.08) 100%); border-radius: 8px; border: 1px solid rgba(128, 24, 54, 0.3);">
            <div style="font-size: 10px; color: #666; margin-bottom: 4px; font-weight: 600;">Acreditados</div>
            <div style="font-size: 22px; font-weight: 700; color: #801836;">${datos.acreditados}</div>
          </div>
          <div style="text-align: center; padding: 12px; background: linear-gradient(135deg, rgba(40, 167, 69, 0.15) 0%, rgba(40, 167, 69, 0.08) 100%); border-radius: 8px; border: 1px solid rgba(40, 167, 69, 0.3);">
            <div style="font-size: 10px; color: #666; margin-bottom: 4px; font-weight: 600;">Asistentes</div>
            <div style="font-size: 22px; font-weight: 700; color: #28a745;">${datos.asistentes}</div>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div style="text-align: center; padding: 10px; background: linear-gradient(135deg, rgba(128, 24, 54, 0.1) 0%, rgba(128, 24, 54, 0.05) 100%); border-radius: 8px;">
            <div style="font-size: 10px; color: #666; margin-bottom: 4px;">Tasa Acreditación</div>
            <div style="font-size: 16px; font-weight: 700; color: #801836;">${tasaAcreditacion}%</div>
          </div>
          <div style="text-align: center; padding: 10px; background: linear-gradient(135deg, rgba(40, 167, 69, 0.1) 0%, rgba(40, 167, 69, 0.05) 100%); border-radius: 8px;">
            <div style="font-size: 10px; color: #666; margin-bottom: 4px;">Tasa Asistencia</div>
            <div style="font-size: 16px; font-weight: 700; color: ${parseFloat(tasaAsistencia) >= 80 ? '#28a745' : parseFloat(tasaAsistencia) >= 60 ? '#ffc107' : '#dc3545'};">${tasaAsistencia}%</div>
          </div>
        </div>
      </div>
    `;
  });
  
  html += `
        </div>
      </div>
      
      <!-- Análisis Cruzado: Inscritos vs Asistentes por Rol -->
      <div style="margin-bottom: 32px; padding-top: 24px; border-top: 2px solid rgba(128, 24, 54, 0.1);">
        <h5 style="color: #801836; font-size: 16px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-user-tag" style="font-size: 16px;"></i>
          Análisis Cruzado: Inscritos vs Asistentes por Rol
        </h5>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
  `;
  
  const rolesCruzados = Object.entries(analisisCruzado.porRol).sort((a, b) => b[1].acreditados - a[1].acreditados);
  rolesCruzados.forEach(([rol, datos], index) => {
    const tasaAsistencia = datos.acreditados > 0 ? ((datos.asistentes / datos.acreditados) * 100).toFixed(1) : 0;
    const tasaInscripcion = datos.acreditados > 0 ? ((datos.inscritos / datos.acreditados) * 100).toFixed(1) : 0;
    const color = colors[index % colors.length];
    const icon = rol === 'STAFF' ? 'fa-user-tie' : 'fa-user-friends';
    
    html += `
      <div style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(247, 245, 246, 0.9) 100%); padding: 20px; border-radius: 12px; border-left: 4px solid ${color}; box-shadow: 0 2px 8px rgba(128, 24, 54, 0.08); transition: all 0.3s;" onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 4px 12px rgba(128, 24, 54, 0.15)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(128, 24, 54, 0.08)'">
        <div style="font-size: 15px; font-weight: 700; color: #801836; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <i class="fas ${icon}" style="font-size: 16px; color: ${color};"></i>
          ${rol}
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 12px;">
          <div style="text-align: center; padding: 12px; background: linear-gradient(135deg, rgba(128, 24, 54, 0.15) 0%, rgba(128, 24, 54, 0.08) 100%); border-radius: 8px; border: 1px solid rgba(128, 24, 54, 0.3);">
            <div style="font-size: 10px; color: #666; margin-bottom: 4px; font-weight: 600;">Acreditados</div>
            <div style="font-size: 22px; font-weight: 700; color: #801836;">${datos.acreditados}</div>
          </div>
          <div style="text-align: center; padding: 12px; background: linear-gradient(135deg, rgba(40, 167, 69, 0.15) 0%, rgba(40, 167, 69, 0.08) 100%); border-radius: 8px; border: 1px solid rgba(40, 167, 69, 0.3);">
            <div style="font-size: 10px; color: #666; margin-bottom: 4px; font-weight: 600;">Asistentes</div>
            <div style="font-size: 22px; font-weight: 700; color: #28a745;">${datos.asistentes}</div>
          </div>
          <div style="text-align: center; padding: 12px; background: linear-gradient(135deg, rgba(255, 193, 7, 0.15) 0%, rgba(255, 193, 7, 0.08) 100%); border-radius: 8px; border: 1px solid rgba(255, 193, 7, 0.3);">
            <div style="font-size: 10px; color: #666; margin-bottom: 4px; font-weight: 600;">Inscritos</div>
            <div style="font-size: 22px; font-weight: 700; color: #ffc107;">${datos.inscritos}</div>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div style="text-align: center; padding: 10px; background: linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 193, 7, 0.05) 100%); border-radius: 8px;">
            <div style="font-size: 10px; color: #666; margin-bottom: 4px;">% Inscritos</div>
            <div style="font-size: 16px; font-weight: 700; color: #ffc107;">${tasaInscripcion}%</div>
          </div>
          <div style="text-align: center; padding: 10px; background: linear-gradient(135deg, rgba(40, 167, 69, 0.1) 0%, rgba(40, 167, 69, 0.05) 100%); border-radius: 8px;">
            <div style="font-size: 10px; color: #666; margin-bottom: 4px;">Tasa Asistencia</div>
            <div style="font-size: 16px; font-weight: 700; color: ${parseFloat(tasaAsistencia) >= 80 ? '#28a745' : parseFloat(tasaAsistencia) >= 60 ? '#ffc107' : '#dc3545'};">${tasaAsistencia}%</div>
          </div>
        </div>
      </div>
    `;
  });
  
  html += `
        </div>
      </div>
      
      <!-- Análisis Cruzado: Inscritos vs Asistentes por Institución -->
      <div style="margin-bottom: 32px; padding-top: 24px; border-top: 2px solid rgba(128, 24, 54, 0.1);">
        <h5 style="color: #801836; font-size: 16px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-building" style="font-size: 16px;"></i>
          Análisis Cruzado: Inscritos vs Asistentes por Institución (Top 10)
        </h5>
        <div style="display: flex; flex-direction: column; gap: 12px;">
  `;
  
  // Las instituciones en analisisCruzado.porInstitucion ya están normalizadas (usando normalizarInstitucion)
  // Esto unifica: "Sta. María La Blanca", "Escuelita", "Secundaria", "ESO" → "Colegio Santa María la Blanca"
  // Y "Camb" → "CSMB"
  const institucionesCruzadas = Object.entries(analisisCruzado.porInstitucion)
    .filter(([_, datos]) => datos.inscritos > 0 || datos.asistentes > 0)
    .sort((a, b) => (b[1].inscritos + b[1].asistentes) - (a[1].inscritos + a[1].asistentes))
    .slice(0, 10);
  
  institucionesCruzadas.forEach(([institucion, datos], index) => {
    const tasaAsistencia = datos.inscritos > 0 ? ((datos.asistentes / datos.inscritos) * 100).toFixed(1) : 0;
    const tasaAcreditacion = datos.inscritos > 0 ? ((datos.acreditados / datos.inscritos) * 100).toFixed(1) : 0;
    const maxTotal = Math.max(...institucionesCruzadas.map(([_, d]) => d.inscritos + d.asistentes + d.acreditados), 1);
    const porcentajeBarra = ((datos.inscritos + datos.asistentes + datos.acreditados) / maxTotal) * 100;
    const color = colors[index % colors.length];
    
    html += `
      <div style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(247, 245, 246, 0.95) 100%); padding: 18px; border-radius: 12px; border-left: 4px solid ${color}; box-shadow: 0 2px 8px rgba(128, 24, 54, 0.08); transition: all 0.3s;" onmouseover="this.style.transform='translateX(5px)'; this.style.boxShadow='0 4px 12px rgba(128, 24, 54, 0.15)'" onmouseout="this.style.transform='translateX(0)'; this.style.boxShadow='0 2px 8px rgba(128, 24, 54, 0.08)'">
        <div style="display: flex; align-items: flex-start; gap: 16px; margin-bottom: 12px;">
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 700; color: #801836; font-size: 15px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <i class="fas fa-building" style="font-size: 14px; color: ${color};"></i>
              <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${institucion}</span>
              ${datos.docentesColegio > 0 ? `<span style="background: linear-gradient(135deg, #801836 0%, #9a1f42 100%); color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 700;" title="${datos.docentesColegio} docentes del colegio">🏫 ${datos.docentesColegio}</span>` : ''}
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
              <div style="text-align: center; padding: 10px; background: linear-gradient(135deg, rgba(255, 193, 7, 0.15) 0%, rgba(255, 193, 7, 0.08) 100%); border-radius: 8px; border: 1px solid rgba(255, 193, 7, 0.3);">
                <div style="font-size: 10px; color: #666; margin-bottom: 4px; font-weight: 600;">Inscritos</div>
                <div style="font-size: 18px; font-weight: 700; color: #ffc107;">${datos.inscritos}</div>
              </div>
              <div style="text-align: center; padding: 10px; background: linear-gradient(135deg, rgba(128, 24, 54, 0.15) 0%, rgba(128, 24, 54, 0.08) 100%); border-radius: 8px; border: 1px solid rgba(128, 24, 54, 0.3);">
                <div style="font-size: 10px; color: #666; margin-bottom: 4px; font-weight: 600;">Acreditados</div>
                <div style="font-size: 18px; font-weight: 700; color: #801836;">${datos.acreditados}</div>
              </div>
              <div style="text-align: center; padding: 10px; background: linear-gradient(135deg, rgba(40, 167, 69, 0.15) 0%, rgba(40, 167, 69, 0.08) 100%); border-radius: 8px; border: 1px solid rgba(40, 167, 69, 0.3);">
                <div style="font-size: 10px; color: #666; margin-bottom: 4px; font-weight: 600;">Asistentes</div>
                <div style="font-size: 18px; font-weight: 700; color: #28a745;">${datos.asistentes}</div>
              </div>
            </div>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
          <div style="text-align: center; padding: 8px; background: linear-gradient(135deg, rgba(128, 24, 54, 0.1) 0%, rgba(128, 24, 54, 0.05) 100%); border-radius: 6px;">
            <div style="font-size: 9px; color: #666; margin-bottom: 2px;">Tasa Acreditación</div>
            <div style="font-size: 14px; font-weight: 700; color: #801836;">${tasaAcreditacion}%</div>
          </div>
          <div style="text-align: center; padding: 8px; background: linear-gradient(135deg, rgba(40, 167, 69, 0.1) 0%, rgba(40, 167, 69, 0.05) 100%); border-radius: 6px;">
            <div style="font-size: 9px; color: #666; margin-bottom: 2px;">Tasa Asistencia</div>
            <div style="font-size: 14px; font-weight: 700; color: ${parseFloat(tasaAsistencia) >= 80 ? '#28a745' : parseFloat(tasaAsistencia) >= 60 ? '#ffc107' : '#dc3545'};">${tasaAsistencia}%</div>
          </div>
        </div>
        <div style="height: 6px; background: rgba(128, 24, 54, 0.1); border-radius: 3px; overflow: hidden;">
          <div style="height: 100%; width: 0%; background: linear-gradient(135deg, ${color} 0%, #801836 100%); border-radius: 3px; transition: width 1s ease ${index * 0.1}s;" data-width="${porcentajeBarra}"></div>
        </div>
      </div>
    `;
  });
  
  html += `
        </div>
      </div>
      
      <!-- Análisis por Tipo de Docente -->
      <div style="margin-bottom: 32px; padding-top: 24px; border-top: 2px solid rgba(128, 24, 54, 0.1);">
        <h5 style="color: #801836; font-size: 16px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-chalkboard-teacher" style="font-size: 16px;"></i>
          Análisis por Tipo de Docente
        </h5>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
  `;
  
  const tiposDocente = [
    { key: 'docentesColegio', label: 'Docentes del Colegio', icon: 'fa-school', color: '#801836' },
    { key: 'docentesExternos', label: 'Docentes Externos', icon: 'fa-user-graduate', color: '#9a1f42' },
    { key: 'noDocentes', label: 'No Docentes', icon: 'fa-users', color: '#b4284e' }
  ];
  
  tiposDocente.forEach((tipo, index) => {
    const datos = analisisCruzado.porTipoDocente[tipo.key];
    const tasaAsistencia = datos.inscritos > 0 ? ((datos.asistentes / datos.inscritos) * 100).toFixed(1) : 0;
    const tasaAcreditacion = datos.inscritos > 0 ? ((datos.acreditados / datos.inscritos) * 100).toFixed(1) : 0;
    
    html += `
      <div style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(247, 245, 246, 0.9) 100%); padding: 20px; border-radius: 12px; border-left: 4px solid ${tipo.color}; box-shadow: 0 2px 8px rgba(128, 24, 54, 0.08); transition: all 0.3s;" onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 4px 12px rgba(128, 24, 54, 0.15)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(128, 24, 54, 0.08)'">
        <div style="font-size: 15px; font-weight: 700; color: #801836; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <i class="fas ${tipo.icon}" style="font-size: 16px; color: ${tipo.color};"></i>
          ${tipo.label}
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 12px;">
          <div style="text-align: center; padding: 12px; background: linear-gradient(135deg, rgba(255, 193, 7, 0.15) 0%, rgba(255, 193, 7, 0.08) 100%); border-radius: 8px; border: 1px solid rgba(255, 193, 7, 0.3);">
            <div style="font-size: 10px; color: #666; margin-bottom: 4px; font-weight: 600;">Inscritos</div>
            <div style="font-size: 22px; font-weight: 700; color: #ffc107;">${datos.inscritos}</div>
          </div>
          <div style="text-align: center; padding: 12px; background: linear-gradient(135deg, rgba(128, 24, 54, 0.15) 0%, rgba(128, 24, 54, 0.08) 100%); border-radius: 8px; border: 1px solid rgba(128, 24, 54, 0.3);">
            <div style="font-size: 10px; color: #666; margin-bottom: 4px; font-weight: 600;">Acreditados</div>
            <div style="font-size: 22px; font-weight: 700; color: #801836;">${datos.acreditados}</div>
          </div>
          <div style="text-align: center; padding: 12px; background: linear-gradient(135deg, rgba(40, 167, 69, 0.15) 0%, rgba(40, 167, 69, 0.08) 100%); border-radius: 8px; border: 1px solid rgba(40, 167, 69, 0.3);">
            <div style="font-size: 10px; color: #666; margin-bottom: 4px; font-weight: 600;">Asistentes</div>
            <div style="font-size: 22px; font-weight: 700; color: #28a745;">${datos.asistentes}</div>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div style="text-align: center; padding: 10px; background: linear-gradient(135deg, rgba(128, 24, 54, 0.1) 0%, rgba(128, 24, 54, 0.05) 100%); border-radius: 8px;">
            <div style="font-size: 10px; color: #666; margin-bottom: 4px;">Tasa Acreditación</div>
            <div style="font-size: 16px; font-weight: 700; color: #801836;">${tasaAcreditacion}%</div>
          </div>
          <div style="text-align: center; padding: 10px; background: linear-gradient(135deg, rgba(40, 167, 69, 0.1) 0%, rgba(40, 167, 69, 0.05) 100%); border-radius: 8px;">
            <div style="font-size: 10px; color: #666; margin-bottom: 4px;">Tasa Asistencia</div>
            <div style="font-size: 16px; font-weight: 700; color: ${parseFloat(tasaAsistencia) >= 80 ? '#28a745' : parseFloat(tasaAsistencia) >= 60 ? '#ffc107' : '#dc3545'};">${tasaAsistencia}%</div>
          </div>
        </div>
      </div>
    `;
  });
  
  html += `
        </div>
      </div>
      
      <!-- Comparativa Visual Docentes -->
      <div style="margin-bottom: 32px; padding-top: 24px; border-top: 2px solid rgba(128, 24, 54, 0.1);">
        <h5 style="color: #801836; font-size: 16px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-balance-scale" style="font-size: 16px;"></i>
          Comparativa: Docentes del Colegio vs Externos
        </h5>
        <div style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(247, 245, 246, 0.95) 100%); padding: 24px; border-radius: 12px; border: 1px solid rgba(128, 24, 54, 0.12); box-shadow: 0 2px 8px rgba(128, 24, 54, 0.08);">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
  `;
  
  const docentesColegio = analisisCruzado.porTipoDocente.docentesColegio;
  const docentesExternos = analisisCruzado.porTipoDocente.docentesExternos;
  const maxInscritos = Math.max(docentesColegio.inscritos, docentesExternos.inscritos, 1);
  const maxAsistentes = Math.max(docentesColegio.asistentes, docentesExternos.asistentes, 1);
  
  html += `
            <div>
              <div style="font-size: 14px; font-weight: 700; color: #801836; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-school" style="color: #801836;"></i>
                Docentes del Colegio
              </div>
              <div style="margin-bottom: 16px;">
                <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Inscritos: ${docentesColegio.inscritos}</div>
                <div style="height: 20px; background: rgba(128, 24, 54, 0.1); border-radius: 10px; overflow: hidden;">
                  <div style="height: 100%; width: ${(docentesColegio.inscritos / maxInscritos) * 100}%; background: linear-gradient(135deg, #801836 0%, #9a1f42 100%); border-radius: 10px; transition: width 1s ease; display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: 700;">${docentesColegio.inscritos}</div>
                </div>
              </div>
              <div>
                <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Asistentes: ${docentesColegio.asistentes}</div>
                <div style="height: 20px; background: rgba(40, 167, 69, 0.1); border-radius: 10px; overflow: hidden;">
                  <div style="height: 100%; width: ${(docentesColegio.asistentes / maxAsistentes) * 100}%; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); border-radius: 10px; transition: width 1s ease 0.2s; display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: 700;">${docentesColegio.asistentes}</div>
                </div>
              </div>
            </div>
            <div>
              <div style="font-size: 14px; font-weight: 700; color: #9a1f42; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-user-graduate" style="color: #9a1f42;"></i>
                Docentes Externos
              </div>
              <div style="margin-bottom: 16px;">
                <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Inscritos: ${docentesExternos.inscritos}</div>
                <div style="height: 20px; background: rgba(154, 31, 66, 0.1); border-radius: 10px; overflow: hidden;">
                  <div style="height: 100%; width: ${(docentesExternos.inscritos / maxInscritos) * 100}%; background: linear-gradient(135deg, #9a1f42 0%, #b4284e 100%); border-radius: 10px; transition: width 1s ease 0.1s; display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: 700;">${docentesExternos.inscritos}</div>
                </div>
              </div>
              <div>
                <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Asistentes: ${docentesExternos.asistentes}</div>
                <div style="height: 20px; background: rgba(40, 167, 69, 0.1); border-radius: 10px; overflow: hidden;">
                  <div style="height: 100%; width: ${(docentesExternos.asistentes / maxAsistentes) * 100}%; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); border-radius: 10px; transition: width 1s ease 0.3s; display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: 700;">${docentesExternos.asistentes}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Resumen General -->
      <div style="margin-bottom: 32px; padding-top: 24px; border-top: 2px solid rgba(128, 24, 54, 0.1);">
        <h5 style="color: #801836; font-size: 16px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-chart-bar" style="font-size: 16px;"></i>
          Resumen General del Cruce de Datos
        </h5>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
          <div style="background: linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 193, 7, 0.05) 100%); padding: 20px; border-radius: 12px; border-left: 4px solid #ffc107; text-align: center; transition: all 0.3s;" onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(255, 193, 7, 0.3)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'">
            <div style="font-size: 32px; font-weight: 700; color: #ffc107; margin-bottom: 8px;">${analisisCruzado.totalInscritos}</div>
            <div style="font-size: 14px; color: #666;">Total Inscritos</div>
          </div>
          <div style="background: linear-gradient(135deg, rgba(128, 24, 54, 0.1) 0%, rgba(128, 24, 54, 0.05) 100%); padding: 20px; border-radius: 12px; border-left: 4px solid #801836; text-align: center; transition: all 0.3s;" onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(128, 24, 54, 0.3)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'">
            <div style="font-size: 32px; font-weight: 700; color: #801836; margin-bottom: 8px;">${analisisCruzado.totalAcreditados}</div>
            <div style="font-size: 14px; color: #666;">Total Acreditados</div>
          </div>
          <div style="background: linear-gradient(135deg, rgba(40, 167, 69, 0.1) 0%, rgba(40, 167, 69, 0.05) 100%); padding: 20px; border-radius: 12px; border-left: 4px solid #28a745; text-align: center; transition: all 0.3s;" onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(40, 167, 69, 0.3)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'">
            <div style="font-size: 32px; font-weight: 700; color: #28a745; margin-bottom: 8px;">${analisisCruzado.totalAsistentes}</div>
            <div style="font-size: 14px; color: #666;">Total Asistentes (con talleres)</div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Eliminar elementos de carga (ya se hizo antes, pero por si acaso)
  wrapper.querySelectorAll('.loading').forEach(el => el.remove());
  wrapper.innerHTML = html;
  
  // Animar las barras
  setTimeout(() => {
    wrapper.querySelectorAll('[data-width]').forEach(bar => {
      bar.style.width = bar.getAttribute('data-width') + '%';
    });
  }, 100);
}

// Función para calcular y mostrar el Net Promoter Score (NPS)
function createNPSChart() {
  const container = document.querySelector('#nps-chart');
  if (!container) {
    console.warn('createNPSChart: No se encontró #nps-chart');
    return;
  }
  
  // Obtener todas las respuestas a la pregunta de recomendación del Foro
  const npsRatings = [];
  
  respuestasData.forEach(row => {
    const rating = row['¿En qué grado recomendarías el Foro de Innovación Educativa?'];
    if (rating && rating.trim() !== '') {
      const r = parseFloat(rating);
      if (!isNaN(r) && r >= 1 && r <= 5) {
        // Convertir escala 1-5 a escala 0-10 para cálculo NPS estándar
        // Fórmula: (valor - 1) * 2.5
        // 1 -> 0, 2 -> 2.5, 3 -> 5, 4 -> 7.5, 5 -> 10
        const npsValue = (r - 1) * 2.5;
        npsRatings.push(npsValue);
      }
    }
  });
  
  // Eliminar elementos de carga
  container.querySelectorAll('.loading').forEach(el => el.remove());
  
  if (npsRatings.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #666;">
        <i class="fas fa-info-circle" style="font-size: 3rem; color: #801836; margin-bottom: 16px; display: block; opacity: 0.7;"></i>
        <p style="font-size: 16px; margin: 0;">No hay datos suficientes para calcular el NPS.</p>
      </div>
    `;
    return;
  }
  
  // Clasificar según NPS estándar (escala 0-10)
  // Promotores: 9-10
  // Pasivos: 7-8
  // Detractores: 0-6
  let promotores = 0;
  let pasivos = 0;
  let detractores = 0;
  
  npsRatings.forEach(rating => {
    if (rating >= 9) {
      promotores++;
    } else if (rating >= 7) {
      pasivos++;
    } else {
      detractores++;
    }
  });
  
  const total = npsRatings.length;
  const porcentajePromotores = (promotores / total) * 100;
  const porcentajePasivos = (pasivos / total) * 100;
  const porcentajeDetractores = (detractores / total) * 100;
  
  // Calcular NPS: % Promotores - % Detractores
  const nps = Math.round(porcentajePromotores - porcentajeDetractores);
  
  // Interpretación del NPS
  let interpretacion = '';
  let colorNPS = '';
  let iconoNPS = '';
  
  if (nps >= 50) {
    interpretacion = 'Excelente';
    colorNPS = '#28a745';
    iconoNPS = 'fa-star';
  } else if (nps >= 0) {
    interpretacion = 'Bueno';
    colorNPS = '#ffc107';
    iconoNPS = 'fa-thumbs-up';
  } else {
    interpretacion = 'Necesita mejora';
    colorNPS = '#dc3545';
    iconoNPS = 'fa-exclamation-triangle';
  }
  
  // Crear visualización
  const maxCount = Math.max(promotores, pasivos, detractores, 1);
  
  let html = `
    <div style="margin-top: 20px; padding: 28px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(247, 245, 246, 0.95) 100%); border-radius: 16px; border: 1px solid rgba(128, 24, 54, 0.12); box-shadow: 0 4px 16px rgba(128, 24, 54, 0.08);">
      <!-- Score Principal -->
      <div style="text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid rgba(128, 24, 54, 0.1);">
        <div style="font-size: 14px; color: #666; margin-bottom: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Net Promoter Score</div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 16px; flex-wrap: wrap;">
          <div style="font-size: 64px; font-weight: 700; color: ${colorNPS}; line-height: 1; text-shadow: 0 2px 8px rgba(0,0,0,0.1);">${nps}</div>
          <div style="text-align: left;">
            <div style="font-size: 18px; font-weight: 700; color: ${colorNPS}; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
              <i class="fas ${iconoNPS}" style="font-size: 16px;"></i>
              ${interpretacion}
            </div>
            <div style="font-size: 12px; color: #666;">de ${total} respuestas</div>
          </div>
        </div>
      </div>
      
      <!-- Distribución -->
      <div style="margin-bottom: 24px;">
        <h4 style="color: #801836; font-size: 16px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-chart-pie" style="font-size: 16px;"></i>
          Distribución de Respuestas
        </h4>
        <div style="display: grid; gap: 16px;">
          <!-- Promotores -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-heart" style="color: #28a745; font-size: 14px;"></i>
                <span style="font-weight: 600; color: #1a1a1a; font-size: 14px;">Promotores (9-10)</span>
              </div>
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 18px; font-weight: 700; color: #28a745;">${promotores}</span>
                <span style="font-size: 13px; color: #666; background: rgba(40, 167, 69, 0.1); padding: 4px 10px; border-radius: 12px; font-weight: 600;">${porcentajePromotores.toFixed(1)}%</span>
              </div>
            </div>
            <div style="height: 12px; background: rgba(40, 167, 69, 0.1); border-radius: 6px; overflow: hidden;">
              <div style="height: 100%; width: 0%; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); border-radius: 6px; transition: width 1s ease; box-shadow: 0 2px 4px rgba(40, 167, 69, 0.3);" data-width="${(promotores / maxCount) * 100}"></div>
            </div>
          </div>
          
          <!-- Pasivos -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-minus-circle" style="color: #ffc107; font-size: 14px;"></i>
                <span style="font-weight: 600; color: #1a1a1a; font-size: 14px;">Pasivos (7-8)</span>
              </div>
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 18px; font-weight: 700; color: #ffc107;">${pasivos}</span>
                <span style="font-size: 13px; color: #666; background: rgba(255, 193, 7, 0.1); padding: 4px 10px; border-radius: 12px; font-weight: 600;">${porcentajePasivos.toFixed(1)}%</span>
              </div>
            </div>
            <div style="height: 12px; background: rgba(255, 193, 7, 0.1); border-radius: 6px; overflow: hidden;">
              <div style="height: 100%; width: 0%; background: linear-gradient(135deg, #ffc107 0%, #ffb300 100%); border-radius: 6px; transition: width 1s ease 0.1s; box-shadow: 0 2px 4px rgba(255, 193, 7, 0.3);" data-width="${(pasivos / maxCount) * 100}"></div>
            </div>
          </div>
          
          <!-- Detractores -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-frown" style="color: #dc3545; font-size: 14px;"></i>
                <span style="font-weight: 600; color: #1a1a1a; font-size: 14px;">Detractores (0-6)</span>
              </div>
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 18px; font-weight: 700; color: #dc3545;">${detractores}</span>
                <span style="font-size: 13px; color: #666; background: rgba(220, 53, 69, 0.1); padding: 4px 10px; border-radius: 12px; font-weight: 600;">${porcentajeDetractores.toFixed(1)}%</span>
              </div>
            </div>
            <div style="height: 12px; background: rgba(220, 53, 69, 0.1); border-radius: 6px; overflow: hidden;">
              <div style="height: 100%; width: 0%; background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); border-radius: 6px; transition: width 1s ease 0.2s; box-shadow: 0 2px 4px rgba(220, 53, 69, 0.3);" data-width="${(detractores / maxCount) * 100}"></div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Información adicional mejorada -->
      <div style="background: linear-gradient(135deg, rgba(128, 24, 54, 0.05) 0%, rgba(128, 24, 54, 0.02) 100%); padding: 20px; border-radius: 12px; border-left: 4px solid #801836;">
        <div style="margin-bottom: 16px;">
          <h5 style="color: #801836; font-size: 14px; font-weight: 700; margin: 0 0 8px 0; display: flex; align-items: center; gap: 6px;">
            <i class="fas fa-question-circle" style="font-size: 14px;"></i>
            ¿Qué es el NPS?
          </h5>
          <div style="font-size: 12px; color: #666; line-height: 1.7;">
            El <strong>Net Promoter Score (NPS)</strong> mide la lealtad y satisfacción de los participantes en una escala de <strong>-100 a +100</strong>.
            Se calcula como: <strong>% Promotores - % Detractores</strong>.
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 12px;">
          <div style="padding: 12px; background: rgba(40, 167, 69, 0.1); border-radius: 8px; border-left: 3px solid #28a745;">
            <div style="font-size: 11px; color: #666; margin-bottom: 4px; font-weight: 600;">Promotores (9-10)</div>
            <div style="font-size: 12px; color: #1a1a1a;">Personas que recomendarían el evento</div>
          </div>
          <div style="padding: 12px; background: rgba(255, 193, 7, 0.1); border-radius: 8px; border-left: 3px solid #ffc107;">
            <div style="font-size: 11px; color: #666; margin-bottom: 4px; font-weight: 600;">Pasivos (7-8)</div>
            <div style="font-size: 12px; color: #1a1a1a;">Personas neutrales</div>
          </div>
          <div style="padding: 12px; background: rgba(220, 53, 69, 0.1); border-radius: 8px; border-left: 3px solid #dc3545;">
            <div style="font-size: 11px; color: #666; margin-bottom: 4px; font-weight: 600;">Detractores (0-6)</div>
            <div style="font-size: 12px; color: #1a1a1a;">Personas que no recomendarían</div>
          </div>
        </div>
        <div style="padding: 12px; background: rgba(128, 24, 54, 0.08); border-radius: 8px; margin-top: 12px;">
          <div style="font-size: 11px; color: #666; margin-bottom: 6px; font-weight: 600;">Interpretación del NPS:</div>
          <div style="display: flex; gap: 16px; flex-wrap: wrap; font-size: 11px;">
            <span style="color: #28a745;"><strong>≥ 50:</strong> Excelente</span>
            <span style="color: #ffc107;"><strong>0-49:</strong> Bueno</span>
            <span style="color: #dc3545;"><strong>&lt; 0:</strong> Necesita mejora</span>
          </div>
        </div>
      </div>
    </div>
  `;
  
  const wrapper = container.querySelector('.chart-wrapper');
  if (wrapper) {
    // Eliminar elementos de carga
    wrapper.querySelectorAll('.loading').forEach(el => el.remove());
    wrapper.innerHTML = html;
    
    // Animar las barras
    setTimeout(() => {
      wrapper.querySelectorAll('[data-width]').forEach(bar => {
        bar.style.width = bar.getAttribute('data-width') + '%';
      });
    }, 100);
  } else {
    // Si no hay wrapper, usar el container directamente
    container.innerHTML = html;
    
    // Animar las barras
    setTimeout(() => {
      container.querySelectorAll('[data-width]').forEach(bar => {
        bar.style.width = bar.getAttribute('data-width') + '%';
      });
    }, 100);
  }
}

// Datos del Foro XIII (extraídos del balance)
// Estos datos pueden ser actualizados manualmente o extraídos del PDF/Excel
const datosForoXIII = {
  año: 2024,
  nombre: 'XIII Foro de Innovación Educativa',
  acreditados: 294, // Inscritos 2024
  asistentes: 250, // Asistentes 2024
  tasaAsistencia: 85.0, // Calculado: (250/294)*100 = 85.03%
  valoraciones: 75, // Valoraciones recibidas 2024
  tasaRespuesta: 30.0, // Calculado: (75/250)*100 = 30.0%
  valoracionMedia: 4.3, // Ajustar según datos reales
  nps: 45, // Ajustar según datos reales
  talleres1730: 10, // Número de talleres
  talleres1830: 10, // Número de talleres
  // Desglose de inscritos 2024
  inscritos: {
    docentesCSMB: 160,
    familias: 44,
    otros: 90
  },
  // Desglose de asistentes 2024
  asistentesDesglose: {
    docentesCSMB: 151,
    familias: 25,
    externos: 74
  },
  perfiles: {
    'Docente': 151, // Docentes CSMB de asistentes 2024
    'Familia': 25, // Familias de asistentes 2024
    'Otros profesionales de la educación': 74 // Externos de asistentes 2024
  },
  comoSeEnteraron: {
    'Invitación directa vía email': 40,
    'Comunicación del centro donde trabajo': 30,
    'Página web del Colegio Santa María la Blanca': 15,
    'Redes sociales': 10,
    'Otros': 5
  }
};

// Variables globales para talleres (necesarias para la comparativa)
let talleres1730Asistentes = {};
let talleres1830Asistentes = {};

// Función para crear la comparativa entre Foro XIII y XIV
function createComparativaForos() {
  // Calcular datos del Foro XIV
  // Datos reales 2025: 262 inscritos, 216 asistentes
  const datosForoXIV = {
    año: 2025,
    nombre: 'XIV Foro de Innovación Educativa - HUMANIA',
    acreditados: 262, // Inscritos 2025
    asistentes: 216, // Asistentes 2025
    // Desglose de inscritos 2025
    inscritos: {
      docentesCSMB: 175,
      familias: 48,
      otros: 40
    },
    // Nota: No se valora el número concreto de asistentes por categoría en 2025
    valoraciones: respuestasData.length,
    tasaRespuesta: 0,
    valoracionMedia: 0,
    nps: 0
  };
  
  // Calcular tasa de asistencia
  datosForoXIV.tasaAsistencia = datosForoXIV.acreditados > 0 
    ? ((datosForoXIV.asistentes / datosForoXIV.acreditados) * 100).toFixed(1)
    : 0;
  
  // Calcular tasa de respuesta
  datosForoXIV.tasaRespuesta = datosForoXIV.asistentes > 0
    ? ((datosForoXIV.valoraciones / datosForoXIV.asistentes) * 100).toFixed(1)
    : 0;
  
  // Calcular valoración media
  let sumaValoraciones = 0;
  let contadorValoraciones = 0;
  respuestasData.forEach(row => {
    const rating = parseFloat(row['¿En qué grado recomendarías el Foro de Innovación Educativa?']);
    if (!isNaN(rating) && rating >= 1 && rating <= 5) {
      sumaValoraciones += rating;
      contadorValoraciones++;
    }
  });
  datosForoXIV.valoracionMedia = contadorValoraciones > 0 
    ? (sumaValoraciones / contadorValoraciones).toFixed(2)
    : 0;
  
  // Calcular NPS
  const npsRatings = [];
  respuestasData.forEach(row => {
    const rating = row['¿En qué grado recomendarías el Foro de Innovación Educativa?'];
    if (rating && rating.trim() !== '') {
      const r = parseFloat(rating);
      if (!isNaN(r) && r >= 1 && r <= 5) {
        const npsValue = (r - 1) * 2.5;
        npsRatings.push(npsValue);
      }
    }
  });
  
  if (npsRatings.length > 0) {
    let promotores = 0;
    let pasivos = 0;
    let detractores = 0;
    npsRatings.forEach(rating => {
      if (rating >= 9) {
        promotores++;
      } else if (rating >= 7) {
        pasivos++;
      } else {
        detractores++;
      }
    });
    const porcentajePromotores = (promotores / npsRatings.length) * 100;
    const porcentajeDetractores = (detractores / npsRatings.length) * 100;
    datosForoXIV.nps = Math.round(porcentajePromotores - porcentajeDetractores);
  }
  
  // Calcular datos adicionales del Foro XIV
  // Perfiles
  const perfilesXIV = {};
  respuestasData.forEach(row => {
    const perfil = row['Soy...']?.trim() || 'Sin especificar';
    perfilesXIV[perfil] = (perfilesXIV[perfil] || 0) + 1;
  });
  
  // Cómo se enteraron
  const fuentesXIV = {};
  respuestasData.forEach(row => {
    const fuente = row['¿Cómo te enteraste de nuestro evento?']?.trim() || 'Sin especificar';
    fuentesXIV[fuente] = (fuentesXIV[fuente] || 0) + 1;
  });
  
  // Talleres - calcular directamente desde asistenciaData
  const talleres1730XIV = new Set();
  const talleres1830XIV = new Set();
  
  asistenciaData.forEach(row => {
    const taller1730 = row['17:30']?.trim();
    const taller1830 = row['18:30']?.trim();
    
    if (taller1730 && taller1730 !== 'Primera sesión' && taller1730 !== '') {
      const nombreTaller = extractTallerName(taller1730);
      talleres1730XIV.add(nombreTaller);
    }
    
    if (taller1830 && taller1830 !== 'Segunda sesión' && taller1830 !== '') {
      const nombreTaller = extractTallerName(taller1830);
      talleres1830XIV.add(nombreTaller);
    }
  });
  
  const totalTalleresXIV = talleres1730XIV.size + talleres1830XIV.size;
  
  // Añadir datos calculados al objeto
  datosForoXIV.perfiles = perfilesXIV;
  datosForoXIV.fuentes = fuentesXIV;
  datosForoXIV.talleres1730 = talleres1730XIV.size;
  datosForoXIV.talleres1830 = talleres1830XIV.size;
  datosForoXIV.totalTalleres = totalTalleresXIV;
  
  // Crear comparativa general
  createComparativaGeneral(datosForoXIII, datosForoXIV);
  createComparativaAsistencia(datosForoXIII, datosForoXIV);
  createComparativaValoraciones(datosForoXIII, datosForoXIV);
  createComparativaNPS(datosForoXIII, datosForoXIV);
  createComparativaTalleres(datosForoXIII, datosForoXIV);
  createComparativaPerfiles(datosForoXIII, datosForoXIV);
  // createComparativaFuentes(datosForoXIII, datosForoXIV);
}

// Función para crear la comparativa general
function createComparativaGeneral(xiii, xiv) {
  const container = document.querySelector('#comparativa-general');
  if (!container) {
    console.warn('createComparativaGeneral: No se encontró #comparativa-general');
    return;
  }
  
  // Eliminar elementos de carga
  container.querySelectorAll('.loading').forEach(el => el.remove());
  
  const metricas = [
    { label: 'Inscritos', xiii: xiii.acreditados, xiv: xiv.acreditados, icon: 'fa-user-check', color: '#801836' },
    { label: 'Asistentes', xiii: xiii.asistentes, xiv: xiv.asistentes, icon: 'fa-user-friends', color: '#9a1f42' },
    { label: 'Tasa Asistencia', xiii: xiii.tasaAsistencia, xiv: parseFloat(xiv.tasaAsistencia), icon: 'fa-percentage', color: '#b4284e', suffix: '%' },
    { label: 'Valoraciones', xiii: xiii.valoraciones, xiv: xiv.valoraciones, icon: 'fa-clipboard-check', color: '#ce315a' },
    { label: 'Tasa Respuesta', xiii: xiii.tasaRespuesta, xiv: parseFloat(xiv.tasaRespuesta), icon: 'fa-reply', color: '#e83966', suffix: '%' },
    { label: 'Valoración Media', xiii: xiii.valoracionMedia, xiv: parseFloat(xiv.valoracionMedia), icon: 'fa-star-half-alt', color: '#ffd700' }
  ];
  
  let html = `
    <div style="margin-top: 20px; padding: 28px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(247, 245, 246, 0.95) 100%); border-radius: 16px; border: 1px solid rgba(128, 24, 54, 0.12); box-shadow: 0 4px 16px rgba(128, 24, 54, 0.08);">
      <div style="margin-bottom: 24px; padding-bottom: 20px; border-bottom: 2px solid rgba(128, 24, 54, 0.1);">
        <h4 style="margin: 0 0 24px 0; color: #801836; font-size: 20px; font-weight: 700; display: flex; align-items: center; gap: 10px;">
          <i class="fas fa-balance-scale" style="font-size: 22px;"></i>
          Comparativa General de Métricas Clave
        </h4>
        <p style="font-size: 13px; color: #666; margin: 0; line-height: 1.5;">
          Análisis de la evolución de las métricas más importantes entre el XIII y el XIV Foro de Innovación Educativa. Los indicadores de color (verde/rojo) muestran si hubo mejora o disminución respecto al año anterior.
        </p>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
  `;
  
  metricas.forEach(metrica => {
    const diferencia = metrica.xiv - metrica.xiii;
    const porcentajeCambio = metrica.xiii > 0 ? ((diferencia / metrica.xiii) * 100).toFixed(1) : 0;
    const esPositivo = diferencia >= 0;
    const colorCambio = esPositivo ? '#28a745' : '#dc3545';
    const iconoCambio = esPositivo ? 'fa-arrow-up' : 'fa-arrow-down';
    
    html += `
      <div style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(247, 245, 246, 0.9) 100%); padding: 20px; border-radius: 12px; border-left: 4px solid ${metrica.color}; box-shadow: 0 2px 8px rgba(128, 24, 54, 0.08); transition: all 0.3s;" onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 4px 12px rgba(128, 24, 54, 0.15)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(128, 24, 54, 0.08)'">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
          <div style="background: linear-gradient(135deg, ${metrica.color} 0%, ${metrica.color}dd 100%); color: white; width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; box-shadow: 0 4px 12px rgba(128, 24, 54, 0.3);">
            <i class="fas ${metrica.icon}"></i>
          </div>
          <div style="flex: 1;">
            <div style="font-size: 14px; font-weight: 700; color: #801836; margin-bottom: 4px;">${metrica.label}</div>
            <div style="font-size: 11px; color: #666;">Comparativa XIII vs XIV</div>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div style="text-align: center; padding: 12px; background: rgba(128, 24, 54, 0.05); border-radius: 8px;">
            <div style="font-size: 11px; color: #666; margin-bottom: 4px;">XIII (${xiii.año})</div>
            <div style="font-size: 24px; font-weight: 700; color: #801836;">${metrica.xiii}${metrica.suffix || ''}</div>
          </div>
          <div style="text-align: center; padding: 12px; background: rgba(40, 167, 69, 0.05); border-radius: 8px;">
            <div style="font-size: 11px; color: #666; margin-bottom: 4px;">XIV (${xiv.año})</div>
            <div style="font-size: 24px; font-weight: 700; color: #28a745;">${metrica.xiv}${metrica.suffix || ''}</div>
          </div>
        </div>
        
        <div style="padding: 10px; background: linear-gradient(135deg, rgba(${esPositivo ? '40, 167, 69' : '220, 53, 69'}, 0.1) 0%, rgba(${esPositivo ? '40, 167, 69' : '220, 53, 69'}, 0.05) 100%); border-radius: 8px; text-align: center; border-left: 3px solid ${colorCambio};">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Variación</div>
          <div style="font-size: 18px; font-weight: 700; color: ${colorCambio}; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <i class="fas ${iconoCambio}" style="font-size: 14px;"></i>
            ${esPositivo ? '+' : ''}${diferencia.toFixed(metrica.suffix ? 1 : 0)}${metrica.suffix || ''} (${porcentajeCambio > 0 ? '+' : ''}${porcentajeCambio}%)
          </div>
        </div>
      </div>
    `;
  });
  
  html += `
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

// Función para crear la comparativa de asistencia
function createComparativaAsistencia(xiii, xiv) {
  const container = document.querySelector('#comparativa-asistencia');
  if (!container) {
    console.warn('createComparativaAsistencia: No se encontró #comparativa-asistencia');
    return;
  }
  
  // Eliminar elementos de carga
  container.querySelectorAll('.loading').forEach(el => el.remove());
  
  const maxAsistentes = Math.max(xiii.asistentes, xiv.asistentes, 1);
  const porcentajeXIII = (xiii.asistentes / maxAsistentes) * 100;
  const porcentajeXIV = (xiv.asistentes / maxAsistentes) * 100;
  
  let html = `
    <div style="margin-top: 20px; padding: 28px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(247, 245, 246, 0.95) 100%); border-radius: 16px; border: 1px solid rgba(128, 24, 54, 0.12); box-shadow: 0 4px 16px rgba(128, 24, 54, 0.08);">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
        <div>
          <div style="font-size: 14px; font-weight: 700; color: #801836; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-calendar-alt" style="color: #801836;"></i>
            ${xiii.nombre}
          </div>
          <div style="font-size: 32px; font-weight: 700; color: #801836; margin-bottom: 8px;">${xiii.asistentes}</div>
          <div style="font-size: 12px; color: #666;">Asistentes</div>
          <div style="height: 12px; background: rgba(128, 24, 54, 0.1); border-radius: 6px; overflow: hidden; margin-top: 12px;">
            <div style="height: 100%; width: ${porcentajeXIII}%; background: linear-gradient(135deg, #801836 0%, #9a1f42 100%); border-radius: 6px; transition: width 1s ease;"></div>
          </div>
        </div>
        <div>
          <div style="font-size: 14px; font-weight: 700; color: #28a745; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-calendar-check" style="color: #28a745;"></i>
            ${xiv.nombre}
          </div>
          <div style="font-size: 32px; font-weight: 700; color: #28a745; margin-bottom: 8px;">${xiv.asistentes}</div>
          <div style="font-size: 12px; color: #666;">Asistentes</div>
          <div style="height: 12px; background: rgba(40, 167, 69, 0.1); border-radius: 6px; overflow: hidden; margin-top: 12px;">
            <div style="height: 100%; width: ${porcentajeXIV}%; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); border-radius: 6px; transition: width 1s ease 0.2s;"></div>
          </div>
        </div>
      </div>
      
      <div style="padding: 16px; background: linear-gradient(135deg, rgba(128, 24, 54, 0.05) 0%, rgba(128, 24, 54, 0.02) 100%); border-radius: 12px; border-left: 4px solid #801836;">
        <div style="font-size: 13px; color: #666; line-height: 1.6;">
          <strong style="color: #801836;">Evolución:</strong> ${xiv.asistentes > xiii.asistentes ? 'Aumento' : 'Disminución'} de 
          <strong>${Math.abs(xiv.asistentes - xiii.asistentes)} asistentes</strong> 
          (${((xiv.asistentes - xiii.asistentes) / xiii.asistentes * 100).toFixed(1)}%) respecto al año anterior.
        </div>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

// Función para crear la comparativa de valoraciones
function createComparativaValoraciones(xiii, xiv) {
  const container = document.querySelector('#comparativa-valoraciones');
  if (!container) {
    console.warn('createComparativaValoraciones: No se encontró #comparativa-valoraciones');
    return;
  }
  
  // Eliminar elementos de carga
  container.querySelectorAll('.loading').forEach(el => el.remove());
  
  const diferencia = parseFloat(xiv.valoracionMedia) - parseFloat(xiii.valoracionMedia);
  const esPositivo = diferencia >= 0;
  const colorCambio = esPositivo ? '#28a745' : '#dc3545';
  
  let html = `
    <div style="margin-top: 20px; padding: 28px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(247, 245, 246, 0.95) 100%); border-radius: 16px; border: 1px solid rgba(128, 24, 54, 0.12); box-shadow: 0 4px 16px rgba(128, 24, 54, 0.08);">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
        <div style="text-align: center; padding: 24px; background: rgba(128, 24, 54, 0.05); border-radius: 12px;">
          <div style="font-size: 14px; color: #666; margin-bottom: 8px;">${xiii.nombre}</div>
          <div style="font-size: 48px; font-weight: 700; color: #801836; margin-bottom: 8px;">${xiii.valoracionMedia}</div>
          <div style="font-size: 12px; color: #666;">Valoración Media (1-5)</div>
          <div style="margin-top: 16px;">
            ${Array.from({ length: 5 }, (_, i) => `
              <i class="fas fa-star" style="color: ${i < Math.round(xiii.valoracionMedia) ? '#ffd700' : '#ddd'}; font-size: 20px; margin: 0 2px;"></i>
            `).join('')}
          </div>
        </div>
        <div style="text-align: center; padding: 24px; background: rgba(40, 167, 69, 0.05); border-radius: 12px;">
          <div style="font-size: 14px; color: #666; margin-bottom: 8px;">${xiv.nombre}</div>
          <div style="font-size: 48px; font-weight: 700; color: #28a745; margin-bottom: 8px;">${xiv.valoracionMedia}</div>
          <div style="font-size: 12px; color: #666;">Valoración Media (1-5)</div>
          <div style="margin-top: 16px;">
            ${Array.from({ length: 5 }, (_, i) => `
              <i class="fas fa-star" style="color: ${i < Math.round(xiv.valoracionMedia) ? '#ffd700' : '#ddd'}; font-size: 20px; margin: 0 2px;"></i>
            `).join('')}
          </div>
        </div>
      </div>
      
      <div style="padding: 16px; background: linear-gradient(135deg, rgba(${esPositivo ? '40, 167, 69' : '220, 53, 69'}, 0.1) 0%, rgba(${esPositivo ? '40, 167, 69' : '220, 53, 69'}, 0.05) 100%); border-radius: 12px; border-left: 4px solid ${colorCambio}; text-align: center;">
        <div style="font-size: 13px; color: #666; line-height: 1.6;">
          <strong style="color: ${colorCambio};">Variación:</strong> ${esPositivo ? 'Mejora' : 'Disminución'} de 
          <strong>${Math.abs(diferencia).toFixed(2)} puntos</strong> 
          en la valoración media respecto al año anterior.
        </div>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

// Función para crear la comparativa de NPS
function createComparativaNPS(xiii, xiv) {
  const container = document.querySelector('#comparativa-nps');
  if (!container) {
    console.warn('createComparativaNPS: No se encontró #comparativa-nps');
    return;
  }
  
  // Eliminar elementos de carga
  container.querySelectorAll('.loading').forEach(el => el.remove());
  
  const diferencia = xiv.nps - xiii.nps;
  const esPositivo = diferencia >= 0;
  const colorCambio = esPositivo ? '#28a745' : '#dc3545';
  const interpretacionXIII = xiii.nps >= 50 ? 'Excelente' : xiii.nps >= 0 ? 'Bueno' : 'Necesita mejora';
  const interpretacionXIV = xiv.nps >= 50 ? 'Excelente' : xiv.nps >= 0 ? 'Bueno' : 'Necesita mejora';
  const colorXIII = xiii.nps >= 50 ? '#28a745' : xiii.nps >= 0 ? '#ffc107' : '#dc3545';
  const colorXIV = xiv.nps >= 50 ? '#28a745' : xiv.nps >= 0 ? '#ffc107' : '#dc3545';
  
  let html = `
    <div style="margin-top: 20px; padding: 28px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(247, 245, 246, 0.95) 100%); border-radius: 16px; border: 1px solid rgba(128, 24, 54, 0.12); box-shadow: 0 4px 16px rgba(128, 24, 54, 0.08);">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
        <div style="text-align: center; padding: 24px; background: rgba(128, 24, 54, 0.05); border-radius: 12px;">
          <div style="font-size: 14px; color: #666; margin-bottom: 8px;">${xiii.nombre}</div>
          <div style="font-size: 56px; font-weight: 700; color: ${colorXIII}; margin-bottom: 8px; line-height: 1;">${xiii.nps}</div>
          <div style="font-size: 12px; color: #666; margin-bottom: 12px;">Net Promoter Score</div>
          <div style="font-size: 14px; font-weight: 600; color: ${colorXIII};">
            <i class="fas fa-${xiii.nps >= 50 ? 'star' : xiii.nps >= 0 ? 'thumbs-up' : 'exclamation-triangle'}" style="margin-right: 6px;"></i>
            ${interpretacionXIII}
          </div>
        </div>
        <div style="text-align: center; padding: 24px; background: rgba(40, 167, 69, 0.05); border-radius: 12px;">
          <div style="font-size: 14px; color: #666; margin-bottom: 8px;">${xiv.nombre}</div>
          <div style="font-size: 56px; font-weight: 700; color: ${colorXIV}; margin-bottom: 8px; line-height: 1;">${xiv.nps}</div>
          <div style="font-size: 12px; color: #666; margin-bottom: 12px;">Net Promoter Score</div>
          <div style="font-size: 14px; font-weight: 600; color: ${colorXIV};">
            <i class="fas fa-${xiv.nps >= 50 ? 'star' : xiv.nps >= 0 ? 'thumbs-up' : 'exclamation-triangle'}" style="margin-right: 6px;"></i>
            ${interpretacionXIV}
          </div>
        </div>
      </div>
      
      <div style="padding: 16px; background: linear-gradient(135deg, rgba(${esPositivo ? '40, 167, 69' : '220, 53, 69'}, 0.1) 0%, rgba(${esPositivo ? '40, 167, 69' : '220, 53, 69'}, 0.05) 100%); border-radius: 12px; border-left: 4px solid ${colorCambio}; text-align: center;">
        <div style="font-size: 13px; color: #666; line-height: 1.6;">
          <strong style="color: ${colorCambio};">Variación:</strong> ${esPositivo ? 'Mejora' : 'Disminución'} de 
          <strong>${Math.abs(diferencia)} puntos</strong> 
          en el NPS respecto al año anterior.
        </div>
        ${Math.abs(diferencia) <= 10 ? `
        <div style="font-size: 11px; color: #999; margin-top: 8px; font-style: italic; line-height: 1.5;">
          <strong>Nota metodológica:</strong> La diferencia de ${Math.abs(diferencia)} puntos está dentro del margen normal de variación estadística. Ambos valores (${xiii.nps} y ${xiv.nps}) se consideran <strong>buenos</strong> según estándares NPS (rango 0-50).<br>
          El NPS del ${xiii.año} (${xiii.nps}) está basado en datos históricos. El NPS del ${xiv.año} (${xiv.nps}) se calcula usando la misma metodología: conversión de escala 1-5 a 0-10 y clasificación estándar (Promotores: 9-10, Pasivos: 7-8, Detractores: 0-6).
        </div>
        ` : ''}
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

// Función para crear la comparativa de talleres
function createComparativaTalleres(xiii, xiv) {
  const container = document.querySelector('#comparativa-talleres');
  if (!container) {
    console.warn('createComparativaTalleres: No se encontró #comparativa-talleres');
    return;
  }
  
  // Eliminar elementos de carga
  container.querySelectorAll('.loading').forEach(el => el.remove());
  
  const totalTalleresXIII = xiii.talleres1730 + xiii.talleres1830;
  const diferencia = xiv.totalTalleres - totalTalleresXIII;
  const esPositivo = diferencia >= 0;
  const colorCambio = esPositivo ? '#28a745' : '#dc3545';
  
  let html = `
    <div style="margin-top: 20px; padding: 28px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(247, 245, 246, 0.95) 100%); border-radius: 16px; border: 1px solid rgba(128, 24, 54, 0.12); box-shadow: 0 4px 16px rgba(128, 24, 54, 0.08);">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
        <div>
          <div style="font-size: 14px; font-weight: 700; color: #801836; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-calendar-alt" style="color: #801836;"></i>
            ${xiii.nombre}
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div style="text-align: center; padding: 16px; background: rgba(128, 24, 54, 0.05); border-radius: 8px;">
              <div style="font-size: 32px; font-weight: 700; color: #801836; margin-bottom: 4px;">${xiii.talleres1730}</div>
              <div style="font-size: 12px; color: #666;">Talleres 17:30</div>
            </div>
            <div style="text-align: center; padding: 16px; background: rgba(128, 24, 54, 0.05); border-radius: 8px;">
              <div style="font-size: 32px; font-weight: 700; color: #801836; margin-bottom: 4px;">${xiii.talleres1830}</div>
              <div style="font-size: 12px; color: #666;">Talleres 18:30</div>
            </div>
          </div>
          <div style="text-align: center; padding: 16px; background: linear-gradient(135deg, rgba(128, 24, 54, 0.1) 0%, rgba(128, 24, 54, 0.05) 100%); border-radius: 8px; margin-top: 12px;">
            <div style="font-size: 24px; font-weight: 700; color: #801836; margin-bottom: 4px;">${totalTalleresXIII}</div>
            <div style="font-size: 12px; color: #666;">Total Talleres</div>
          </div>
        </div>
        <div>
          <div style="font-size: 14px; font-weight: 700; color: #28a745; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-calendar-check" style="color: #28a745;"></i>
            ${xiv.nombre}
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div style="text-align: center; padding: 16px; background: rgba(40, 167, 69, 0.05); border-radius: 8px;">
              <div style="font-size: 32px; font-weight: 700; color: #28a745; margin-bottom: 4px;">${xiv.talleres1730}</div>
              <div style="font-size: 12px; color: #666;">Talleres 17:30</div>
            </div>
            <div style="text-align: center; padding: 16px; background: rgba(40, 167, 69, 0.05); border-radius: 8px;">
              <div style="font-size: 32px; font-weight: 700; color: #28a745; margin-bottom: 4px;">${xiv.talleres1830}</div>
              <div style="font-size: 12px; color: #666;">Talleres 18:30</div>
            </div>
          </div>
          <div style="text-align: center; padding: 16px; background: linear-gradient(135deg, rgba(40, 167, 69, 0.1) 0%, rgba(40, 167, 69, 0.05) 100%); border-radius: 8px; margin-top: 12px;">
            <div style="font-size: 24px; font-weight: 700; color: #28a745; margin-bottom: 4px;">${xiv.totalTalleres}</div>
            <div style="font-size: 12px; color: #666;">Total Talleres</div>
          </div>
        </div>
      </div>
      
      <div style="padding: 16px; background: linear-gradient(135deg, rgba(${esPositivo ? '40, 167, 69' : '220, 53, 69'}, 0.1) 0%, rgba(${esPositivo ? '40, 167, 69' : '220, 53, 69'}, 0.05) 100%); border-radius: 12px; border-left: 4px solid ${colorCambio}; text-align: center;">
        <div style="font-size: 13px; color: #666; line-height: 1.6;">
          <strong style="color: ${colorCambio};">Variación:</strong> ${esPositivo ? 'Aumento' : 'Disminución'} de 
          <strong>${Math.abs(diferencia)} talleres</strong> 
          (${totalTalleresXIII > 0 ? ((diferencia / totalTalleresXIII) * 100).toFixed(1) : 0}%) respecto al año anterior.
        </div>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

// Función para crear la comparativa de perfiles
function createComparativaPerfiles(xiii, xiv) {
  const container = document.querySelector('#comparativa-perfiles');
  if (!container) {
    console.warn('createComparativaPerfiles: No se encontró #comparativa-perfiles');
    return;
  }
  
  // Eliminar elementos de carga
  container.querySelectorAll('.loading').forEach(el => el.remove());
  
  // Normalizar perfiles para comparación
  const perfilesUnicos = new Set([...Object.keys(xiii.perfiles || {}), ...Object.keys(xiv.perfiles || {})]);
  const perfilesArray = Array.from(perfilesUnicos);
  
  let html = `
    <div style="margin-top: 20px; padding: 28px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(247, 245, 246, 0.95) 100%); border-radius: 16px; border: 1px solid rgba(128, 24, 54, 0.12); box-shadow: 0 4px 16px rgba(128, 24, 54, 0.08);">
      <div style="display: grid; gap: 16px;">
  `;
  
  perfilesArray.forEach(perfil => {
    const xiiiCount = xiii.perfiles[perfil] || 0;
    const xivCount = xiv.perfiles[perfil] || 0;
    const diferencia = xivCount - xiiiCount;
    const esPositivo = diferencia >= 0;
    const colorCambio = esPositivo ? '#28a745' : '#dc3545';
    const maxCount = Math.max(xiiiCount, xivCount, 1);
    
    html += `
      <div style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(247, 245, 246, 0.9) 100%); padding: 16px; border-radius: 12px; border-left: 4px solid #801836; box-shadow: 0 2px 8px rgba(128, 24, 54, 0.08);">
        <div style="font-size: 14px; font-weight: 700; color: #801836; margin-bottom: 12px;">${perfil}</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div style="text-align: center; padding: 12px; background: rgba(128, 24, 54, 0.05); border-radius: 8px;">
            <div style="font-size: 11px; color: #666; margin-bottom: 4px;">XIII (${xiii.año})</div>
            <div style="font-size: 20px; font-weight: 700; color: #801836;">${xiiiCount}</div>
          </div>
          <div style="text-align: center; padding: 12px; background: rgba(40, 167, 69, 0.05); border-radius: 8px;">
            <div style="font-size: 11px; color: #666; margin-bottom: 4px;">XIV (${xiv.año})</div>
            <div style="font-size: 20px; font-weight: 700; color: #28a745;">${xivCount}</div>
          </div>
          <div style="text-align: center; padding: 12px; background: linear-gradient(135deg, rgba(${esPositivo ? '40, 167, 69' : '220, 53, 69'}, 0.1) 0%, rgba(${esPositivo ? '40, 167, 69' : '220, 53, 69'}, 0.05) 100%); border-radius: 8px; border-left: 3px solid ${colorCambio};">
            <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Variación</div>
            <div style="font-size: 16px; font-weight: 700; color: ${colorCambio};">
              ${esPositivo ? '+' : ''}${diferencia}
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <div style="flex: 1; height: 8px; background: rgba(128, 24, 54, 0.1); border-radius: 4px; overflow: hidden;">
            <div style="height: 100%; width: ${(xiiiCount / maxCount) * 100}%; background: linear-gradient(135deg, #801836 0%, #9a1f42 100%); border-radius: 4px; transition: width 1s ease;"></div>
          </div>
          <div style="flex: 1; height: 8px; background: rgba(40, 167, 69, 0.1); border-radius: 4px; overflow: hidden;">
            <div style="height: 100%; width: ${(xivCount / maxCount) * 100}%; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); border-radius: 4px; transition: width 1s ease 0.2s;"></div>
          </div>
        </div>
      </div>
    `;
  });
  
  html += `
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

// Función para crear la comparativa de fuentes
function createComparativaFuentes(xiii, xiv) {
  const container = document.querySelector('#comparativa-fuentes');
  if (!container) {
    console.warn('createComparativaFuentes: No se encontró #comparativa-fuentes');
    return;
  }
  
  // Eliminar elementos de carga
  container.querySelectorAll('.loading').forEach(el => el.remove());
  
  // Normalizar fuentes para comparación
  const fuentesUnicas = new Set([...Object.keys(xiii.comoSeEnteraron || {}), ...Object.keys(xiv.fuentes || {})]);
  const fuentesArray = Array.from(fuentesUnicas);
  
  let html = `
    <div style="margin-top: 20px; padding: 28px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(247, 245, 246, 0.95) 100%); border-radius: 16px; border: 1px solid rgba(128, 24, 54, 0.12); box-shadow: 0 4px 16px rgba(128, 24, 54, 0.08);">
      <div style="display: grid; gap: 16px;">
  `;
  
  fuentesArray.forEach(fuente => {
    const xiiiCount = xiii.comoSeEnteraron[fuente] || 0;
    const xivCount = xiv.fuentes[fuente] || 0;
    const diferencia = xivCount - xiiiCount;
    const esPositivo = diferencia >= 0;
    const colorCambio = esPositivo ? '#28a745' : '#dc3545';
    const maxCount = Math.max(xiiiCount, xivCount, 1);
    
    html += `
      <div style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(247, 245, 246, 0.9) 100%); padding: 16px; border-radius: 12px; border-left: 4px solid #801836; box-shadow: 0 2px 8px rgba(128, 24, 54, 0.08);">
        <div style="font-size: 14px; font-weight: 700; color: #801836; margin-bottom: 12px;">${fuente}</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div style="text-align: center; padding: 12px; background: rgba(128, 24, 54, 0.05); border-radius: 8px;">
            <div style="font-size: 11px; color: #666; margin-bottom: 4px;">XIII (${xiii.año})</div>
            <div style="font-size: 20px; font-weight: 700; color: #801836;">${xiiiCount}</div>
          </div>
          <div style="text-align: center; padding: 12px; background: rgba(40, 167, 69, 0.05); border-radius: 8px;">
            <div style="font-size: 11px; color: #666; margin-bottom: 4px;">XIV (${xiv.año})</div>
            <div style="font-size: 20px; font-weight: 700; color: #28a745;">${xivCount}</div>
          </div>
          <div style="text-align: center; padding: 12px; background: linear-gradient(135deg, rgba(${esPositivo ? '40, 167, 69' : '220, 53, 69'}, 0.1) 0%, rgba(${esPositivo ? '40, 167, 69' : '220, 53, 69'}, 0.05) 100%); border-radius: 8px; border-left: 3px solid ${colorCambio};">
            <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Variación</div>
            <div style="font-size: 16px; font-weight: 700; color: ${colorCambio};">
              ${esPositivo ? '+' : ''}${diferencia}
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <div style="flex: 1; height: 8px; background: rgba(128, 24, 54, 0.1); border-radius: 4px; overflow: hidden;">
            <div style="height: 100%; width: ${(xiiiCount / maxCount) * 100}%; background: linear-gradient(135deg, #801836 0%, #9a1f42 100%); border-radius: 4px; transition: width 1s ease;"></div>
          </div>
          <div style="flex: 1; height: 8px; background: rgba(40, 167, 69, 0.1); border-radius: 4px; overflow: hidden;">
            <div style="height: 100%; width: ${(xivCount / maxCount) * 100}%; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); border-radius: 4px; transition: width 1s ease 0.2s;"></div>
          </div>
        </div>
      </div>
    `;
  });
  
  html += `
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

// Función para crear el listado de asistentes
function createAsistentesList() {
  const container = document.querySelector('#lista-asistentes');
  if (!container) {
    console.warn('createAsistentesList: No se encontró #lista-asistentes');
    return;
  }
  
  // Eliminar elementos de carga
  container.querySelectorAll('.loading').forEach(el => el.remove());
  
  // Obtener lista de asistentes (con talleres) por email
  const asistentesConTalleres = asistenciaData.filter(row => {
    const taller1730 = row['17:30']?.trim();
    const taller1830 = row['18:30']?.trim();
    return (taller1730 && taller1730 !== '' && taller1730 !== 'Primera sesión') ||
           (taller1830 && taller1830 !== '' && taller1830 !== 'Segunda sesión');
  });
  
  // Recolectar información completa de cada asistente
  const asistentesCompletos = [];
  
  asistentesConTalleres.forEach(row => {
    const email = row.Email?.trim()?.toLowerCase();
    if (!email) return;
    
    // Buscar información adicional en inscripciones
    let nombre = `${row.Nombre || ''} ${row.Apellidos || ''}`.trim() || 'Sin nombre';
    let institucion = row.Institucion?.trim() || '';
    let perfil = row.Rol?.trim() || 'Sin especificar';
    
    // Intentar obtener datos de inscripciones si están disponibles
    if (inscripcionesData && inscripcionesData.length > 0) {
      const inscripcion = inscripcionesData.find(i => i.Email?.trim()?.toLowerCase() === email);
      if (inscripcion) {
        nombre = `${inscripcion.Nombre || ''} ${inscripcion.Apellidos || ''}`.trim() || nombre;
        const instInscripcion = inscripcion['Institución a la que perteneces']?.trim();
        if (instInscripcion) {
          institucion = instInscripcion;
        }
        const perfilInscripcion = inscripcion['Me inscribo como']?.trim();
        if (perfilInscripcion) {
          perfil = perfilInscripcion;
        }
      }
    }
    
    const institucionNormalizada = normalizarInstitucion(institucion, email);
    const esDocente = esDocenteColegio(email);
    const esDocentePerfil = perfil.toLowerCase().includes('docente') || perfil.toLowerCase().includes('profesor');
    
    let tipoDocente = 'noDocentes';
    if (esDocente) {
      tipoDocente = 'docentesColegio';
    } else if (esDocentePerfil) {
      tipoDocente = 'docentesExternos';
    }
    
    const taller1730 = row['17:30']?.trim();
    const taller1830 = row['18:30']?.trim();
    const talleres = [];
    if (taller1730 && taller1730 !== '' && taller1730 !== 'Primera sesión') {
      talleres.push(extractTallerName(taller1730));
    }
    if (taller1830 && taller1830 !== '' && taller1830 !== 'Segunda sesión') {
      talleres.push(extractTallerName(taller1830));
    }
    
    asistentesCompletos.push({
      nombre: nombre,
      email: email,
      institucion: institucionNormalizada,
      perfil: perfil,
      tipoDocente: tipoDocente,
      esDocenteColegio: esDocente,
      talleres: talleres,
      rol: row.Rol?.trim() || 'Sin especificar'
    });
  });
  
  // Eliminar duplicados por email (por si hay múltiples registros)
  const asistentesUnicos = new Map();
  asistentesCompletos.forEach(asistente => {
    if (!asistentesUnicos.has(asistente.email)) {
      asistentesUnicos.set(asistente.email, asistente);
    } else {
      // Si ya existe, combinar talleres
      const existente = asistentesUnicos.get(asistente.email);
      existente.talleres = [...new Set([...existente.talleres, ...asistente.talleres])];
    }
  });
  
  const asistentes = Array.from(asistentesUnicos.values());
  
  // Ordenar por institución y luego por nombre
  asistentes.sort((a, b) => {
    if (a.institucion !== b.institucion) {
      return a.institucion.localeCompare(b.institucion);
    }
    return a.nombre.localeCompare(b.nombre);
  });
  
  // Agrupar por institución para el filtro
  const institucionesUnicas = [...new Set(asistentes.map(p => p.institucion))].sort();
  const selectInstitucion = document.getElementById('filtro-asistentes-institucion');
  if (selectInstitucion) {
    selectInstitucion.innerHTML = '<option value="">Todas las instituciones</option>';
    institucionesUnicas.forEach(inst => {
      const option = document.createElement('option');
      option.value = inst;
      option.textContent = inst;
      selectInstitucion.appendChild(option);
    });
  }
  
  // Función para renderizar la lista
  const renderizarLista = () => {
    const filtroDocentesColegio = document.getElementById('filtro-asistentes-docentes-colegio')?.checked ?? true;
    const filtroDocentesExternos = document.getElementById('filtro-asistentes-docentes-externos')?.checked ?? true;
    const filtroNoDocentes = document.getElementById('filtro-asistentes-no-docentes')?.checked ?? true;
    const filtroInstitucion = document.getElementById('filtro-asistentes-institucion')?.value || '';
    const busqueda = (document.getElementById('busqueda-asistentes')?.value || '').toLowerCase().trim();
    
    const filtrados = asistentes.filter(persona => {
      if (!filtroDocentesColegio && persona.tipoDocente === 'docentesColegio') return false;
      if (!filtroDocentesExternos && persona.tipoDocente === 'docentesExternos') return false;
      if (!filtroNoDocentes && persona.tipoDocente === 'noDocentes') return false;
      if (filtroInstitucion && persona.institucion !== filtroInstitucion) return false;
      if (busqueda) {
        const textoBusqueda = `${persona.nombre} ${persona.email} ${persona.institucion} ${persona.perfil}`.toLowerCase();
        if (!textoBusqueda.includes(busqueda)) return false;
      }
      return true;
    });
    
    if (filtrados.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #666;">
          <i class="fas fa-info-circle" style="font-size: 3rem; color: #801836; margin-bottom: 16px; display: block; opacity: 0.7;"></i>
          <p style="font-size: 16px; margin: 0;">No hay personas que cumplan los criterios de filtrado.</p>
        </div>
      `;
      return;
    }
    
    // Agrupar por institución
    const agrupadosPorInstitucion = {};
    filtrados.forEach(persona => {
      if (!agrupadosPorInstitucion[persona.institucion]) {
        agrupadosPorInstitucion[persona.institucion] = [];
      }
      agrupadosPorInstitucion[persona.institucion].push(persona);
    });
    
    let html = `
      <div style="margin-top: 20px;">
        <div style="background: linear-gradient(135deg, rgba(40, 167, 69, 0.1) 0%, rgba(40, 167, 69, 0.05) 100%); padding: 16px; border-radius: 12px; margin-bottom: 24px; border-left: 4px solid #28a745;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
              <div style="font-size: 24px; font-weight: 700; color: #28a745; margin-bottom: 4px;">${filtrados.length}</div>
              <div style="font-size: 14px; color: #666;">Personas que asistieron</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Total sin filtrar:</div>
              <div style="font-size: 18px; font-weight: 700; color: #28a745;">${asistentes.length}</div>
            </div>
          </div>
        </div>
    `;
    
    Object.entries(agrupadosPorInstitucion)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([institucion, personas]) => {
        html += `
          <div style="margin-bottom: 32px;">
            <h4 style="color: #801836; font-size: 18px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; padding-bottom: 8px; border-bottom: 2px solid rgba(128, 24, 54, 0.2);">
              <i class="fas fa-building" style="font-size: 16px;"></i>
              ${institucion}
              <span style="background: rgba(40, 167, 69, 0.1); color: #28a745; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: 600; margin-left: auto;">${personas.length}</span>
            </h4>
            <div style="display: grid; gap: 12px;">
        `;
        
        personas.forEach(persona => {
          const iconoTipo = persona.tipoDocente === 'docentesColegio' ? 'fa-school' :
                           persona.tipoDocente === 'docentesExternos' ? 'fa-user-graduate' : 'fa-user';
          const colorTipo = persona.tipoDocente === 'docentesColegio' ? '#801836' :
                           persona.tipoDocente === 'docentesExternos' ? '#9a1f42' : '#666';
          const labelTipo = persona.tipoDocente === 'docentesColegio' ? 'Docente Colegio' :
                           persona.tipoDocente === 'docentesExternos' ? 'Docente Externo' : 'No Docente';
          
          html += `
            <div style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(247, 245, 246, 0.95) 100%); padding: 16px; border-radius: 12px; border-left: 4px solid ${colorTipo}; box-shadow: 0 2px 8px rgba(128, 24, 54, 0.08); transition: all 0.3s;" onmouseover="this.style.transform='translateX(5px)'; this.style.boxShadow='0 4px 12px rgba(128, 24, 54, 0.15)'" onmouseout="this.style.transform='translateX(0)'; this.style.boxShadow='0 2px 8px rgba(128, 24, 54, 0.08)'">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 200px;">
                  <div style="font-size: 16px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas ${iconoTipo}" style="font-size: 14px; color: ${colorTipo};"></i>
                    ${persona.nombre}
                  </div>
                  <div style="font-size: 13px; color: #666; margin-bottom: 4px;">
                    <i class="fas fa-envelope" style="font-size: 11px; margin-right: 6px;"></i>
                    ${persona.email}
                  </div>
                  <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 8px; margin-bottom: 8px;">
                    <span style="background: linear-gradient(135deg, ${colorTipo} 0%, ${colorTipo}dd 100%); color: white; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 600;">
                      ${labelTipo}
                    </span>
                    <span style="background: rgba(128, 24, 54, 0.1); color: #801836; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 600;">
                      ${persona.perfil}
                    </span>
                  </div>
                  ${persona.talleres.length > 0 ? `
                    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(128, 24, 54, 0.1);">
                      <div style="font-size: 11px; color: #666; margin-bottom: 4px; font-weight: 600;">
                        <i class="fas fa-chalkboard-teacher" style="margin-right: 4px;"></i>
                        Talleres:
                      </div>
                      <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                        ${persona.talleres.map(taller => `
                          <span style="background: linear-gradient(135deg, rgba(40, 167, 69, 0.15) 0%, rgba(40, 167, 69, 0.08) 100%); color: #155724; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 600; border: 1px solid rgba(40, 167, 69, 0.3);">
                            ${taller}
                          </span>
                        `).join('')}
                      </div>
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
          `;
        });
        
        html += `
            </div>
          </div>
        `;
      });
    
    html += `</div>`;
    container.innerHTML = html;
  };
  
  // Renderizar inicialmente
  renderizarLista();
  
  // Añadir event listeners a los filtros
  document.getElementById('filtro-asistentes-docentes-colegio')?.addEventListener('change', renderizarLista);
  document.getElementById('filtro-asistentes-docentes-externos')?.addEventListener('change', renderizarLista);
  document.getElementById('filtro-asistentes-no-docentes')?.addEventListener('change', renderizarLista);
  document.getElementById('filtro-asistentes-institucion')?.addEventListener('change', renderizarLista);
  document.getElementById('busqueda-asistentes')?.addEventListener('input', renderizarLista);
}

// Función para crear el listado de no asistentes
function createNoAsistentesList() {
  const container = document.querySelector('#lista-no-asistentes');
  if (!container) {
    console.warn('createNoAsistentesList: No se encontró #lista-no-asistentes');
    return;
  }
  
  // Eliminar elementos de carga
  container.querySelectorAll('.loading').forEach(el => el.remove());
  
  // Obtener lista de asistentes (con talleres) por email
  const asistentesConTalleres = asistenciaData.filter(row => {
    const taller1730 = row['17:30']?.trim();
    const taller1830 = row['18:30']?.trim();
    return (taller1730 && taller1730 !== '' && taller1730 !== 'Primera sesión') ||
           (taller1830 && taller1830 !== '' && taller1830 !== 'Segunda sesión');
  });
  
  const emailsAsistentes = new Set(
    asistentesConTalleres.map(row => row.Email?.trim()?.toLowerCase()).filter(Boolean)
  );
  
  // También considerar todos los registros de asistencia (incluso sin talleres) como asistentes
  asistenciaData.forEach(row => {
    const email = row.Email?.trim()?.toLowerCase();
    if (email) {
      emailsAsistentes.add(email);
    }
  });
  
  // Recolectar todas las personas (de inscripciones y acreditaciones)
  const todasLasPersonas = new Map();
  
  // Procesar inscripciones
  if (inscripcionesData && inscripcionesData.length > 0) {
    inscripcionesData.forEach(row => {
      const email = row.Email?.trim()?.toLowerCase();
      if (!email) return;
      
      const nombre = `${row.Nombre || ''} ${row.Apellidos || ''}`.trim() || 'Sin nombre';
      const institucion = row['Institución a la que perteneces']?.trim() || '';
      const institucionNormalizada = normalizarInstitucion(institucion, email);
      const perfil = row['Me inscribo como']?.trim() || 'Sin especificar';
      const esDocente = esDocenteColegio(email);
      const esDocentePerfil = perfil.toLowerCase().includes('docente') || perfil.toLowerCase().includes('profesor');
      
      let tipoDocente = 'noDocentes';
      if (esDocente) {
        tipoDocente = 'docentesColegio';
      } else if (esDocentePerfil) {
        tipoDocente = 'docentesExternos';
      }
      
      if (!todasLasPersonas.has(email)) {
        todasLasPersonas.set(email, {
          nombre: nombre,
          email: email,
          institucion: institucionNormalizada,
          perfil: perfil,
          tipoDocente: tipoDocente,
          esDocenteColegio: esDocente,
          fuente: 'Inscripción'
        });
      }
    });
  }
  
  // Procesar acreditaciones (para capturar los que no están en inscripciones)
  if (acreditacionesData && acreditacionesData.length > 0) {
    acreditacionesData.forEach(row => {
      const email = row.Email?.trim()?.toLowerCase();
      if (!email) return;
      
      // Si ya está en el mapa, actualizar fuente
      if (todasLasPersonas.has(email)) {
        todasLasPersonas.get(email).fuente += ', Acreditación';
      } else {
        // Buscar nombre en asistencia si está ahí
        const asistente = asistenciaData.find(a => a.Email?.trim()?.toLowerCase() === email);
        const nombre = asistente ? `${asistente.Nombre || ''} ${asistente.Apellidos || ''}`.trim() : 
                      (row.Nombre ? `${row.Nombre || ''} ${row.Apellidos || ''}`.trim() : 'Sin nombre');
        const rol = row.Rol?.trim() || 'Sin especificar';
        const institucion = row.Institucion?.trim() || '';
        const institucionNormalizada = normalizarInstitucion(institucion, email);
        const esDocente = esDocenteColegio(email);
        
        let tipoDocente = 'noDocentes';
        if (esDocente) {
          tipoDocente = 'docentesColegio';
        } else if (rol.toLowerCase().includes('docente') || rol.toLowerCase().includes('profesor')) {
          tipoDocente = 'docentesExternos';
        }
        
        todasLasPersonas.set(email, {
          nombre: nombre,
          email: email,
          institucion: institucionNormalizada,
          perfil: rol,
          tipoDocente: tipoDocente,
          esDocenteColegio: esDocente,
          fuente: 'Acreditación'
        });
      }
    });
  }
  
  // Filtrar solo los que NO asistieron
  const noAsistentes = Array.from(todasLasPersonas.values()).filter(persona => {
    return !emailsAsistentes.has(persona.email);
  });
  
  // Ordenar por institución y luego por nombre
  noAsistentes.sort((a, b) => {
    if (a.institucion !== b.institucion) {
      return a.institucion.localeCompare(b.institucion);
    }
    return a.nombre.localeCompare(b.nombre);
  });
  
  // Agrupar por institución para el filtro
  const institucionesUnicas = [...new Set(noAsistentes.map(p => p.institucion))].sort();
  const selectInstitucion = document.getElementById('filtro-institucion');
  if (selectInstitucion) {
    selectInstitucion.innerHTML = '<option value="">Todas las instituciones</option>';
    institucionesUnicas.forEach(inst => {
      const option = document.createElement('option');
      option.value = inst;
      option.textContent = inst;
      selectInstitucion.appendChild(option);
    });
  }
  
  // Función para renderizar la lista
  const renderizarLista = () => {
    const filtroDocentesColegio = document.getElementById('filtro-docentes-colegio')?.checked ?? true;
    const filtroDocentesExternos = document.getElementById('filtro-docentes-externos')?.checked ?? true;
    const filtroNoDocentes = document.getElementById('filtro-no-docentes')?.checked ?? true;
    const filtroInstitucion = document.getElementById('filtro-institucion')?.value || '';
    const busqueda = (document.getElementById('busqueda-no-asistentes')?.value || '').toLowerCase().trim();
    
    const filtrados = noAsistentes.filter(persona => {
      if (!filtroDocentesColegio && persona.tipoDocente === 'docentesColegio') return false;
      if (!filtroDocentesExternos && persona.tipoDocente === 'docentesExternos') return false;
      if (!filtroNoDocentes && persona.tipoDocente === 'noDocentes') return false;
      if (filtroInstitucion && persona.institucion !== filtroInstitucion) return false;
      if (busqueda) {
        const textoBusqueda = `${persona.nombre} ${persona.email} ${persona.institucion} ${persona.perfil}`.toLowerCase();
        if (!textoBusqueda.includes(busqueda)) return false;
      }
      return true;
    });
    
    if (filtrados.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #666;">
          <i class="fas fa-check-circle" style="font-size: 3rem; color: #28a745; margin-bottom: 16px; display: block; opacity: 0.7;"></i>
          <p style="font-size: 16px; margin: 0;">No hay personas que cumplan los criterios de filtrado.</p>
        </div>
      `;
      return;
    }
    
    // Agrupar por institución
    const agrupadosPorInstitucion = {};
    filtrados.forEach(persona => {
      if (!agrupadosPorInstitucion[persona.institucion]) {
        agrupadosPorInstitucion[persona.institucion] = [];
      }
      agrupadosPorInstitucion[persona.institucion].push(persona);
    });
    
    let html = `
      <div style="margin-top: 20px;">
        <div style="background: linear-gradient(135deg, rgba(128, 24, 54, 0.1) 0%, rgba(128, 24, 54, 0.05) 100%); padding: 16px; border-radius: 12px; margin-bottom: 24px; border-left: 4px solid #801836;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
              <div style="font-size: 24px; font-weight: 700; color: #801836; margin-bottom: 4px;">${filtrados.length}</div>
              <div style="font-size: 14px; color: #666;">Personas que no asistieron</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Total sin filtrar:</div>
              <div style="font-size: 18px; font-weight: 700; color: #801836;">${noAsistentes.length}</div>
              <div style="font-size: 10px; color: #999; margin-top: 4px; font-style: italic;">
                (${acreditacionesData.length} acreditados - ${asistenciaData.length} asistentes)
              </div>
            </div>
          </div>
        </div>
    `;
    
    Object.entries(agrupadosPorInstitucion)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([institucion, personas]) => {
        html += `
          <div style="margin-bottom: 32px;">
            <h4 style="color: #801836; font-size: 18px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; padding-bottom: 8px; border-bottom: 2px solid rgba(128, 24, 54, 0.2);">
              <i class="fas fa-building" style="font-size: 16px;"></i>
              ${institucion}
              <span style="background: rgba(128, 24, 54, 0.1); color: #801836; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: 600; margin-left: auto;">${personas.length}</span>
            </h4>
            <div style="display: grid; gap: 12px;">
        `;
        
        personas.forEach(persona => {
          const iconoTipo = persona.tipoDocente === 'docentesColegio' ? 'fa-school' :
                           persona.tipoDocente === 'docentesExternos' ? 'fa-user-graduate' : 'fa-user';
          const colorTipo = persona.tipoDocente === 'docentesColegio' ? '#801836' :
                           persona.tipoDocente === 'docentesExternos' ? '#9a1f42' : '#666';
          const labelTipo = persona.tipoDocente === 'docentesColegio' ? 'Docente Colegio' :
                           persona.tipoDocente === 'docentesExternos' ? 'Docente Externo' : 'No Docente';
          
          html += `
            <div style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(247, 245, 246, 0.95) 100%); padding: 16px; border-radius: 12px; border-left: 4px solid ${colorTipo}; box-shadow: 0 2px 8px rgba(128, 24, 54, 0.08); transition: all 0.3s;" onmouseover="this.style.transform='translateX(5px)'; this.style.boxShadow='0 4px 12px rgba(128, 24, 54, 0.15)'" onmouseout="this.style.transform='translateX(0)'; this.style.boxShadow='0 2px 8px rgba(128, 24, 54, 0.08)'">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 200px;">
                  <div style="font-size: 16px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas ${iconoTipo}" style="font-size: 14px; color: ${colorTipo};"></i>
                    ${persona.nombre}
                  </div>
                  <div style="font-size: 13px; color: #666; margin-bottom: 4px;">
                    <i class="fas fa-envelope" style="font-size: 11px; margin-right: 6px;"></i>
                    ${persona.email}
                  </div>
                  <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 8px;">
                    <span style="background: linear-gradient(135deg, ${colorTipo} 0%, ${colorTipo}dd 100%); color: white; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 600;">
                      ${labelTipo}
                    </span>
                    <span style="background: rgba(128, 24, 54, 0.1); color: #801836; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 600;">
                      ${persona.perfil}
                    </span>
                    <span style="background: rgba(255, 193, 7, 0.15); color: #856404; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 600;">
                      ${persona.fuente}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          `;
        });
        
        html += `
            </div>
          </div>
        `;
      });
    
    html += `</div>`;
    container.innerHTML = html;
  };
  
  // Renderizar inicialmente
  renderizarLista();
  
  // Añadir event listeners a los filtros
  document.getElementById('filtro-docentes-colegio')?.addEventListener('change', renderizarLista);
  document.getElementById('filtro-docentes-externos')?.addEventListener('change', renderizarLista);
  document.getElementById('filtro-no-docentes')?.addEventListener('change', renderizarLista);
  document.getElementById('filtro-institucion')?.addEventListener('change', renderizarLista);
  document.getElementById('busqueda-no-asistentes')?.addEventListener('input', renderizarLista);
}

// Nueva función para gráfico de valoración de charla inspiracional mejorado
function createCharlaChart(valoraciones) {
  const container = document.querySelector('#valoracion .chart-container');
  if (!container) return;
  
  const sorted = Object.entries(valoraciones).sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));
  const total = Object.values(valoraciones).reduce((a, b) => a + b, 0);
  const promedio = total > 0 ? (Object.entries(valoraciones).reduce((sum, [v, c]) => sum + parseFloat(v) * c, 0) / total).toFixed(2) : 0;
  const maxCount = Math.max(...Object.values(valoraciones), 1);
  const colors = ['#801836', '#9a1f42', '#b4284e', '#ce315a', '#e83966'];
  
  if (sorted.length === 0) return;
  
  let html = `
    <div style="margin-top: 30px; padding-top: 30px; border-top: 2px solid rgba(128, 24, 54, 0.1);">
      <h4 style="color: #801836; font-size: 18px; font-weight: 700; margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
        <i class="fas fa-microphone-alt" style="font-size: 18px;"></i>
        Valoración de la Charla Inspiracional
      </h4>
      <div style="background: linear-gradient(135deg, #801836 0%, #6a1430 100%); color: white; padding: 24px; border-radius: 12px; margin-bottom: 24px; text-align: center; box-shadow: 0 4px 16px rgba(128, 24, 54, 0.3);">
        <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 8px;">
          <div style="font-size: 48px; font-weight: 900; line-height: 1;">${promedio}</div>
          <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px;">
            ${'<i class="fas fa-star" style="color: #ffd700; font-size: 20px; text-shadow: 0 1px 2px rgba(0,0,0,0.2);"></i>'.repeat(Math.round(parseFloat(promedio)))}
            ${'<i class="far fa-star" style="color: rgba(255,255,255,0.5); font-size: 20px;"></i>'.repeat(5 - Math.round(parseFloat(promedio)))}
          </div>
        </div>
        <div style="font-size: 14px; opacity: 0.95;">Valoración media (${total} ${total === 1 ? 'respuesta' : 'respuestas'})</div>
      </div>
      <div style="display: grid; gap: 14px;">
  `;
  
  sorted.forEach(([valoracion, count], index) => {
    const porcentaje = maxCount > 0 ? ((count / maxCount) * 100) : 0;
    const percentageOfTotal = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
    const color = colors[parseInt(valoracion) - 1] || colors[0];
    
    html += `
      <div style="background: rgba(247, 245, 246, 0.8); backdrop-filter: blur(10px); border: 1px solid rgba(128, 24, 54, 0.1); padding: 18px; border-radius: 12px; border-left: 4px solid ${color}; transition: all 0.3s; cursor: pointer; box-shadow: 0 2px 8px rgba(128, 24, 54, 0.05);" onmouseover="this.style.transform='translateX(5px)'; this.style.boxShadow='0 4px 12px rgba(128, 24, 54, 0.15)'" onmouseout="this.style.transform='translateX(0)'; this.style.boxShadow='0 2px 8px rgba(128, 24, 54, 0.05)'">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="display: flex; gap: 4px;">
              ${'<i class="fas fa-star" style="color: #ffd700; font-size: 16px; text-shadow: 0 1px 2px rgba(0,0,0,0.1);"></i>'.repeat(parseInt(valoracion))}
              ${'<i class="far fa-star" style="color: #ddd; font-size: 16px;"></i>'.repeat(5 - parseInt(valoracion))}
            </div>
            <span style="font-weight: 600; color: #1a1a1a; font-size: 15px;">${valoracion} ${valoracion === '1' ? 'estrella' : 'estrellas'}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="color: #666; font-size: 12px;">${percentageOfTotal}%</span>
            <span style="background: linear-gradient(135deg, ${color} 0%, #801836 100%); color: white; padding: 6px 14px; border-radius: 20px; font-size: 14px; font-weight: 600; box-shadow: 0 2px 8px rgba(128, 24, 54, 0.3);">${count}</span>
          </div>
        </div>
        <div style="position: relative; height: 10px; background: rgba(128, 24, 54, 0.1); border-radius: 5px; overflow: hidden; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);">
          <div style="position: absolute; left: 0; top: 0; height: 100%; width: 0%; background: linear-gradient(135deg, ${color} 0%, #801836 100%); border-radius: 5px; transition: width 0.8s ease ${index * 0.1}s; box-shadow: 0 1px 4px rgba(128, 24, 54, 0.3);" data-width="${porcentaje}"></div>
        </div>
      </div>
    `;
  });
  
  html += '</div></div>';
  
  const wrapper = container.querySelector('.chart-wrapper');
  if (wrapper) {
    // Eliminar elementos de carga
    wrapper.querySelectorAll('.loading').forEach(el => el.remove());
    wrapper.innerHTML = wrapper.innerHTML + html;
    // Animar las barras
    setTimeout(() => {
      wrapper.querySelectorAll('[data-width]').forEach(bar => {
        bar.style.width = bar.getAttribute('data-width') + '%';
      });
    }, 100);
  } else {
    console.warn('createCharlaChart: No se encontró .chart-wrapper');
  }
}


// Función para analizar y categorizar sugerencias
function analizarSugerencias(sugerencias) {
  const categorias = {
    duracion: {
      nombre: 'Duración de talleres insuficiente',
      menciones: [],
      keywords: ['corto', 'cortos', 'tiempo', 'minutos', 'duración', 'microtaller', 'microtalleres', 'apremio', 'saborearlo', 'profundizar', 'extensión', 'extender', 'más largo', 'más largos', 'hora', 'horas', '15 minutos', 'se me hacen', 'no da tiempo', 'muy corto', 'muy cortos', 'se quedan', 'escasos', 'sensación', 'apremio', 'acelerado', 'acelerados']
    },
    formato: {
      nombre: 'Propuestas de mejora de formato',
      menciones: [],
      keywords: ['2 días', 'dos días', 'un solo taller', 'un taller', '2 horas', 'dos horas', 'reducir', 'cantidad', 'anualmente', 'anual', 'solo uno', 'un solo', 'menos cantidad', 'más tiempo', 'sesión', 'sesiones']
    },
    logistica: {
      nombre: 'Logística y organización',
      menciones: [],
      keywords: ['día', 'horario', 'horarios', 'empezó tarde', 'tarde', 'niños', 'niño', 'jugar', 'espacio', 'cuidado', 'infantil', 'familia', 'puntualidad', 'transición', 'puntualmente']
    },
    contenido: {
      nombre: 'Contenido y selección',
      menciones: [],
      keywords: ['nuevo', 'teoría', 'práctico', 'práctica', 'aplicable', 'dinámica', 'dinámicas', 'conocido', 'conocida', 'aportar', 'ya conocemos', 'ya conocen', 'participativo', 'participativos']
    },
    otros: {
      nombre: 'Otras sugerencias',
      menciones: [],
      keywords: ['grabar', 'vídeo', 'video', 'preguntas', 'respuestas', 'interacción', 'presentación', 'actuación', 'publicidad', 'publicidad', 'grabación', 'acceso', 'posterior']
    }
  };
  
  sugerencias.forEach(sugerencia => {
    const sugerenciaLower = sugerencia.toLowerCase();
    let categorizada = false;
    
    // Duración (prioridad alta)
    if (categorias.duracion.keywords.some(kw => sugerenciaLower.includes(kw))) {
      categorias.duracion.menciones.push(sugerencia);
      categorizada = true;
    }
    
    // Formato
    if (!categorizada && categorias.formato.keywords.some(kw => sugerenciaLower.includes(kw))) {
      categorias.formato.menciones.push(sugerencia);
      categorizada = true;
    }
    
    // Logística
    if (!categorizada && categorias.logistica.keywords.some(kw => sugerenciaLower.includes(kw))) {
      categorias.logistica.menciones.push(sugerencia);
      categorizada = true;
    }
    
    // Contenido
    if (!categorizada && categorias.contenido.keywords.some(kw => sugerenciaLower.includes(kw))) {
      categorias.contenido.menciones.push(sugerencia);
      categorizada = true;
    }
    
    // Otros
    if (!categorizada) {
      categorias.otros.menciones.push(sugerencia);
    }
  });
  
  return categorias;
}

function updateTables() {
  // This would create detailed tables if needed
}

function updateLists() {
  // Verificar que los datos estén cargados
  if (!respuestasData || respuestasData.length === 0) {
    console.warn('updateLists: No hay datos de respuestas cargados');
    // Mostrar mensaje de error en todos los contenedores
    document.querySelectorAll('#propuestas .list-container').forEach(container => {
      const ul = container.querySelector('ul');
      if (ul) {
        ul.innerHTML = '';
        ul.style.display = 'none';
      }
      container.querySelectorAll('.loading').forEach(el => el.remove());
      const noData = document.createElement('div');
      noData.style.cssText = 'text-align: center; padding: 40px; color: #666;';
      noData.innerHTML = '<i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #801836; margin-bottom: 12px; display: block;"></i><p style="margin: 0;">No hay datos disponibles</p>';
      container.appendChild(noData);
    });
    return;
  }
  
  try {
    // Función para normalizar y agrupar temas similares
    function normalizarTema(tema) {
      if (!tema || tema.length < 3) return null;
      
      let normalizado = tema.toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
        .replace(/[^\w\s]/g, ' ') // Reemplazar caracteres especiales con espacios
        .replace(/\s+/g, ' ') // Múltiples espacios a uno
        .trim();
      
      // Agrupar variaciones comunes
      const grupos = {
        'emocional': ['emocional', 'emociones', 'sentimientos', 'bienestar emocional', 'salud mental', 'gestión emocional', 'inteligencia emocional'],
        'diversidad': ['diversidad', 'dirversidad', 'inclusión', 'inclusivo', 'atención a la diversidad', 'atención diversidad'],
        'ia': ['inteligencia artificial', 'ia', 'ai', 'tecnología', 'innovación tecnológica', 'digital', 'gestión de emociones con la ia'],
        'familia': ['familia', 'escuela familia', 'cohesión', 'relación', 'vínculo', 'padres'],
        'salud': ['salud', 'bienestar', 'salud mental'],
        'innovación': ['innovación', 'innovación científica', 'innovación tecnológica', 'dinámicas innovadoras']
      };
      
      // Buscar grupo al que pertenece
      for (const [grupo, variaciones] of Object.entries(grupos)) {
        for (const variacion of variaciones) {
          if (normalizado.includes(variacion) || variacion.includes(normalizado)) {
            return grupo;
          }
        }
      }
      
      // Si no coincide con ningún grupo, devolver el tema normalizado
      return normalizado;
    }
    
    // Extract themes and suggestions
    const temas = {};
    const sugerencias = [];
    
    respuestasData.forEach((row) => {
      const tema = row['¿Sobre qué temática te gustaría que girara el Foro de Innovación del curso 26-27?']?.trim();
      const sugerencia = row['¿Tienes alguna sugerencia, propuesta o mejora que te gustaría compartir?']?.trim();
      
      if (tema && tema.length > 3) {
        const temaNormalizado = normalizarTema(tema);
        if (temaNormalizado) {
          temas[temaNormalizado] = (temas[temaNormalizado] || 0) + 1;
        }
      }
      
      if (sugerencia && sugerencia.length > 10) {
        // Filtrar sugerencias que empiezan con "Me da" o son irrelevantes
        const sugerenciaLower = sugerencia.toLowerCase().trim();
        if (!sugerenciaLower.startsWith('me da') && 
            !sugerenciaLower.startsWith('me da ') &&
            sugerenciaLower !== 'me da') {
          sugerencias.push(sugerencia);
        }
      }
    });
    
    // Analizar y categorizar sugerencias
    const categorias = analizarSugerencias(sugerencias);
    
    // 1. GRÁFICO DE BARRAS HORIZONTAL PARA TEMÁTICAS
    mostrarTematicasChart(temas);
    
    // 2. GRÁFICO DE QUESITO PARA CATEGORÍAS DE SUGERENCIAS
    mostrarCategoriasPieChart(categorias);
    
    // 3. GRÁFICO DE BARRAS VERTICALES PARA ÁREAS DE MEJORA
    mostrarAreasMejoraChart(categorias);
    
    // 4. LISTA DE SUGERENCIAS DESTACADAS
    mostrarSugerenciasDestacadas(sugerencias);
    
    console.log('updateLists: Todas las visualizaciones se han actualizado correctamente');
  } catch (error) {
    console.error('updateLists: Error al procesar los datos:', error);
    // Mostrar mensaje de error
    document.querySelectorAll('#propuestas .list-container').forEach(container => {
      const ul = container.querySelector('ul');
      if (ul) {
        ul.innerHTML = '';
        ul.style.display = 'none';
      }
      container.querySelectorAll('.loading, .temas-chart-container, .categorias-pie-container, .areas-mejora-chart-container, .sugerencias-grid-container').forEach(el => el.remove());
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = 'text-align: center; padding: 40px; color: #dc3545;';
      errorDiv.innerHTML = '<i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 12px; display: block;"></i><p style="margin: 0;">Error al cargar los datos</p>';
      container.appendChild(errorDiv);
    });
  }
}

// Función para mostrar gráfico de barras horizontal de temáticas
function mostrarTematicasChart(temas) {
  const containers = document.querySelectorAll('#propuestas .list-container');
  const container = containers[0]; // Primera lista: Principales Temáticas Identificadas
  if (!container) {
    console.warn('mostrarTematicasChart: No se encontró el contenedor');
    return;
  }
  
  // Limpiar todo el contenido existente
  const ul = container.querySelector('ul');
  if (ul) {
    ul.innerHTML = '';
    ul.style.display = 'none';
  }
  
  // Eliminar todos los elementos de carga y contenedores existentes
  container.querySelectorAll('.loading, .temas-chart-container').forEach(el => el.remove());
  
  const temasOrdenados = Object.entries(temas)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);
  
  if (temasOrdenados.length === 0) {
    const noData = document.createElement('div');
    noData.style.cssText = 'text-align: center; padding: 40px; color: #666;';
    noData.innerHTML = '<i class="fas fa-info-circle" style="font-size: 2rem; color: #801836; margin-bottom: 12px; display: block;"></i><p style="margin: 0;">No hay temáticas propuestas</p>';
    container.appendChild(noData);
    return;
  }
  
  const maxCount = temasOrdenados[0][1];
  const totalTemas = Object.values(temas).reduce((sum, val) => sum + val, 0);
  
  const chartDiv = document.createElement('div');
  chartDiv.className = 'temas-chart-container';
  chartDiv.style.cssText = 'margin-top: 24px; padding: 28px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(247, 245, 246, 0.95) 100%); border-radius: 16px; border: 1px solid rgba(128, 24, 54, 0.12); box-shadow: 0 4px 16px rgba(128, 24, 54, 0.08);';
  
  let chartHTML = '<div style="display: flex; flex-direction: column; gap: 14px;">';
  
  // Mapeo de temas normalizados a nombres legibles
  const nombresTemas = {
    'emocional': 'Educación Emocional y Bienestar',
    'diversidad': 'Atención a la Diversidad e Inclusión',
    'ia': 'Inteligencia Artificial y Tecnología',
    'familia': 'Relación Escuela-Familia',
    'salud': 'Salud y Bienestar',
    'innovación': 'Innovación Educativa'
  };
  
  temasOrdenados.forEach(([tema, count], index) => {
    const porcentaje = (count / maxCount) * 100;
    const nombreLegible = nombresTemas[tema] || tema.split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    const temaEscapado = nombreLegible.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // Colores más suaves y elegantes
    const colors = [
      '#801836', '#9a1f42', '#b4284e', '#ce315a', '#e83966', '#f04a7a'
    ];
    const color = colors[index % colors.length];
    const percentageOfTotal = totalTemas > 0 ? ((count / totalTemas) * 100).toFixed(1) : 0;
    
    chartHTML += `
      <div style="display: flex; align-items: center; gap: 20px; padding: 16px 20px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(247, 245, 246, 0.9) 100%); border-radius: 12px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border-left: 4px solid ${color}; box-shadow: 0 2px 8px rgba(128, 24, 54, 0.08);" onmouseover="this.style.transform='translateX(8px)'; this.style.boxShadow='0 6px 20px rgba(128, 24, 54, 0.15)'; this.style.background='linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(247, 245, 246, 1) 100%)'" onmouseout="this.style.transform='translateX(0)'; this.style.boxShadow='0 2px 8px rgba(128, 24, 54, 0.08)'; this.style.background='linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(247, 245, 246, 0.9) 100%)'">
        <div style="flex: 0 0 240px; min-width: 0;">
          <div style="font-size: 15px; font-weight: 600; color: #1a1a1a; line-height: 1.5; word-wrap: break-word;">${temaEscapado}</div>
        </div>
        <div style="flex: 1; position: relative; min-width: 0;">
          <div style="position: relative; height: 44px; background: rgba(128, 24, 54, 0.08); border-radius: 10px; overflow: hidden; box-shadow: inset 0 2px 6px rgba(0,0,0,0.06);">
            <div style="position: absolute; left: 0; top: 0; height: 100%; width: 0%; background: linear-gradient(135deg, ${color} 0%, ${colors[(index + 1) % colors.length]} 100%); border-radius: 10px; transition: width 1.2s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.08}s; display: flex; align-items: center; justify-content: flex-end; padding-right: 16px; box-shadow: 0 3px 10px rgba(128, 24, 54, 0.25);" data-width="${porcentaje}">
              <span style="color: white; font-weight: 700; font-size: 15px; text-shadow: 0 1px 3px rgba(0,0,0,0.2); letter-spacing: 0.5px;">${count}</span>
            </div>
          </div>
        </div>
        <div style="flex: 0 0 90px; text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
          <div style="font-size: 18px; font-weight: 700; color: ${color}; line-height: 1;">${count}</div>
          <div style="font-size: 12px; color: #666; font-weight: 500;">${percentageOfTotal}%</div>
        </div>
      </div>
    `;
  });
  
  chartHTML += '</div>';
  chartDiv.innerHTML = chartHTML;
  container.appendChild(chartDiv);
  
  // Animar las barras después de insertar
  setTimeout(() => {
    chartDiv.querySelectorAll('[data-width]').forEach(bar => {
      bar.style.width = bar.getAttribute('data-width') + '%';
    });
  }, 100);
}

// Función para mostrar gráfico de quesito de categorías
function mostrarCategoriasPieChart(categorias) {
  const containers = document.querySelectorAll('#propuestas .list-container');
  const container = containers[2]; // Tercera lista: Análisis Categorizado de Sugerencias
  if (!container) {
    console.warn('mostrarCategoriasPieChart: No se encontró el contenedor');
    return;
  }
  
  // Limpiar todo el contenido existente
  const ul = container.querySelector('ul');
  if (ul) {
    ul.innerHTML = '';
    ul.style.display = 'none';
  }
  
  // Eliminar todos los elementos de carga y contenedores existentes
  container.querySelectorAll('.loading, .categorias-pie-container').forEach(el => el.remove());
  
  const categoriasOrdenadas = Object.values(categorias)
    .filter(cat => cat.menciones.length > 0)
    .sort((a, b) => b.menciones.length - a.menciones.length);
  
  if (categoriasOrdenadas.length === 0) {
    const noData = document.createElement('div');
    noData.style.cssText = 'text-align: center; padding: 40px; color: #666;';
    noData.innerHTML = '<i class="fas fa-info-circle" style="font-size: 2rem; color: #801836; margin-bottom: 12px; display: block;"></i><p style="margin: 0;">No hay categorías disponibles</p>';
    container.appendChild(noData);
    return;
  }
  
  const total = categoriasOrdenadas.reduce((sum, cat) => sum + cat.menciones.length, 0);
  const colors = ['#801836', '#9a1f42', '#b4284e', '#ce315a', '#e83966'];
  
  const pieDiv = document.createElement('div');
  pieDiv.className = 'categorias-pie-container';
  pieDiv.style.cssText = 'margin-top: 24px; display: grid; grid-template-columns: 1fr 1.2fr; gap: 28px; align-items: start;';
  
  // Gráfico de quesito SVG - Corregido
  const radius = 85;
  const circumference = 2 * Math.PI * radius;
  const centerX = 100;
  const centerY = 100;
  let currentAngle = -90; // Empezar desde arriba (rotado -90 grados)
  
  const pieSegments = categoriasOrdenadas.map((cat, index) => {
    const percentage = (cat.menciones.length / total) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;
    
    // Convertir ángulos a radianes
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;
    
    // Calcular puntos para el arco
    const x1 = centerX + radius * Math.cos(startAngleRad);
    const y1 = centerY + radius * Math.sin(startAngleRad);
    const x2 = centerX + radius * Math.cos(endAngleRad);
    const y2 = centerY + radius * Math.sin(endAngleRad);
    
    // Large arc flag (1 si el ángulo es > 180)
    const largeArcFlag = angle > 180 ? 1 : 0;
    
    return {
      percentage: percentage,
      startAngle: startAngle,
      endAngle: endAngle,
      angle: angle,
      x1: x1,
      y1: y1,
      x2: x2,
      y2: y2,
      largeArcFlag: largeArcFlag,
      color: colors[index % colors.length],
      index: index,
      count: cat.menciones.length,
      nombre: cat.nombre
    };
  });
  
  const pieChartHTML = `
    <div style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(247, 245, 246, 0.95) 100%); padding: 28px; border-radius: 16px; border: 1px solid rgba(128, 24, 54, 0.12); box-shadow: 0 4px 16px rgba(128, 24, 54, 0.08);">
      <h4 style="margin: 0 0 24px 0; color: #801836; font-size: 18px; font-weight: 700; text-align: center; letter-spacing: 0.3px;">Distribución por Categorías</h4>
      <div style="position: relative; width: 100%; max-width: 300px; margin: 0 auto;">
        <svg viewBox="0 0 200 200" style="width: 100%; height: auto;">
          ${pieSegments.map(segment => `
            <path
              d="M ${centerX} ${centerY} L ${segment.x1} ${segment.y1} A ${radius} ${radius} 0 ${segment.largeArcFlag} 1 ${segment.x2} ${segment.y2} Z"
              fill="${segment.color}"
              stroke="white"
              stroke-width="2"
              style="opacity: 0; transition: opacity 0.5s ease ${segment.index * 0.1}s;"
              data-segment-index="${segment.index}"
            />
          `).join('')}
          <circle
            cx="${centerX}"
            cy="${centerY}"
            r="${radius - 35}"
            fill="white"
          />
        </svg>
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; pointer-events: none;">
          <div style="font-size: 32px; font-weight: 700; color: #801836;">${total}</div>
          <div style="font-size: 12px; color: #666;">menciones</div>
        </div>
      </div>
    </div>
  `;
  
  // Leyenda
  const legendHTML = `
    <div style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(247, 245, 246, 0.95) 100%); padding: 28px; border-radius: 16px; border: 1px solid rgba(128, 24, 54, 0.12); box-shadow: 0 4px 16px rgba(128, 24, 54, 0.08);">
      <h4 style="margin: 0 0 24px 0; color: #801836; font-size: 18px; font-weight: 700; letter-spacing: 0.3px;">Categorías</h4>
      <div style="display: flex; flex-direction: column; gap: 12px;">
        ${categoriasOrdenadas.map((cat, index) => {
          const percentage = ((cat.menciones.length / total) * 100).toFixed(1);
          const color = colors[index % colors.length];
          return `
            <div style="display: flex; align-items: center; gap: 14px; padding: 16px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(247, 245, 246, 0.9) 100%); border-radius: 12px; border-left: 4px solid ${color}; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; box-shadow: 0 2px 8px rgba(128, 24, 54, 0.06);" onmouseover="this.style.background='linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(247, 245, 246, 1) 100%)'; this.style.transform='translateX(6px)'; this.style.boxShadow='0 4px 16px rgba(128, 24, 54, 0.12)'" onmouseout="this.style.background='linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(247, 245, 246, 0.9) 100%)'; this.style.transform='translateX(0)'; this.style.boxShadow='0 2px 8px rgba(128, 24, 54, 0.06)'">
              <div style="width: 28px; height: 28px; background: linear-gradient(135deg, ${color} 0%, ${colors[(index + 1) % colors.length]} 100%); border-radius: 8px; flex-shrink: 0; box-shadow: 0 3px 8px rgba(128, 24, 54, 0.25); display: flex; align-items: center; justify-content: center;">
                <div style="width: 20px; height: 20px; background: white; border-radius: 4px; opacity: 0.3;"></div>
              </div>
              <div style="flex: 1;">
                <div style="font-weight: 600; color: #1a1a1a; font-size: 15px; margin-bottom: 6px; letter-spacing: 0.2px;">${cat.nombre}</div>
                <div style="font-size: 13px; color: #666; display: flex; align-items: center; gap: 10px; font-weight: 500;">
                  <i class="fas fa-comment" style="font-size: 12px; color: ${color};"></i>
                  <span>${cat.menciones.length} ${cat.menciones.length === 1 ? 'mención' : 'menciones'}</span>
                  <span style="color: ${color}; font-weight: 700; background: rgba(128, 24, 54, 0.08); padding: 2px 8px; border-radius: 12px; font-size: 12px;">${percentage}%</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
  
  pieDiv.innerHTML = pieChartHTML + legendHTML;
  container.appendChild(pieDiv);
  
  // Animar el gráfico de quesito
  setTimeout(() => {
    pieDiv.querySelectorAll('path[data-segment-index]').forEach(path => {
      path.style.opacity = '1';
    });
  }, 100);
}

// Función para mostrar gráfico de barras verticales de áreas de mejora
function mostrarAreasMejoraChart(categorias) {
  const containers = document.querySelectorAll('#propuestas .list-container');
  const container = containers[3]; // Cuarta lista: Áreas de Mejora Prioritarias
  if (!container) {
    console.warn('mostrarAreasMejoraChart: No se encontró el contenedor');
    return;
  }
  
  // Limpiar todo el contenido existente
  const ul = container.querySelector('ul');
  if (ul) {
    ul.innerHTML = '';
    ul.style.display = 'none';
  }
  
  // Eliminar todos los elementos de carga y contenedores existentes
  container.querySelectorAll('.loading, .areas-mejora-chart-container').forEach(el => el.remove());
  
  const areasMejora = [
    {
      titulo: 'Duración de los talleres',
      menciones: categorias.duracion.menciones.length,
      icon: 'fa-clock'
    },
    {
      titulo: 'Gestión del tiempo',
      menciones: categorias.logistica.menciones.length,
      icon: 'fa-hourglass-half'
    },
    {
      titulo: 'Contenido aplicado',
      menciones: categorias.contenido.menciones.length,
      icon: 'fa-lightbulb'
    },
    {
      titulo: 'Accesibilidad familiar',
      menciones: categorias.logistica.menciones.filter(s => s.toLowerCase().includes('niño') || s.toLowerCase().includes('niños')).length,
      icon: 'fa-users'
    },
    {
      titulo: 'Difusión externa',
      menciones: categorias.otros.menciones.filter(s => s.toLowerCase().includes('publicidad')).length,
      icon: 'fa-bullhorn'
    }
  ].filter(area => area.menciones > 0).sort((a, b) => b.menciones - a.menciones);
  
  if (areasMejora.length === 0) {
    const noData = document.createElement('div');
    noData.style.cssText = 'text-align: center; padding: 40px; color: #666;';
    noData.innerHTML = '<i class="fas fa-info-circle" style="font-size: 2rem; color: #801836; margin-bottom: 12px; display: block;"></i><p style="margin: 0;">No hay áreas de mejora identificadas</p>';
    container.appendChild(noData);
    return;
  }
  
  const maxMenciones = areasMejora[0].menciones;
  const chartDiv = document.createElement('div');
  chartDiv.className = 'areas-mejora-chart-container';
  chartDiv.style.cssText = 'margin-top: 24px; padding: 28px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(247, 245, 246, 0.95) 100%); border-radius: 16px; border: 1px solid rgba(128, 24, 54, 0.12); box-shadow: 0 4px 16px rgba(128, 24, 54, 0.08);';
  
  let chartHTML = `
    <h4 style="margin: 0 0 28px 0; color: #801836; font-size: 18px; font-weight: 700; text-align: center; letter-spacing: 0.3px;">Áreas de Mejora Prioritarias</h4>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 24px; align-items: end;">
  `;
  
  areasMejora.forEach((area, index) => {
    const height = (area.menciones / maxMenciones) * 200;
    const colors = ['#801836', '#9a1f42', '#b4284e', '#ce315a', '#e83966'];
    const color = colors[index % colors.length];
    const percentage = maxMenciones > 0 ? ((area.menciones / maxMenciones) * 100).toFixed(0) : 0;
    
    chartHTML += `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 20px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(247, 245, 246, 0.9) 100%); border-radius: 14px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; border: 1px solid rgba(128, 24, 54, 0.08); box-shadow: 0 2px 10px rgba(128, 24, 54, 0.06);" onmouseover="this.style.background='linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(247, 245, 246, 1) 100%)'; this.style.transform='translateY(-8px)'; this.style.boxShadow='0 8px 24px rgba(128, 24, 54, 0.15)'; this.style.borderColor='rgba(128, 24, 54, 0.2)'" onmouseout="this.style.background='linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(247, 245, 246, 0.9) 100%)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 10px rgba(128, 24, 54, 0.06)'; this.style.borderColor='rgba(128, 24, 54, 0.08)'">
        <div style="position: relative; width: 100%; height: 260px; display: flex; align-items: flex-end; justify-content: center;">
          <div style="position: relative; width: 75px; height: 0%; background: linear-gradient(180deg, ${color} 0%, ${colors[(index + 1) % colors.length]} 100%); border-radius: 12px 12px 0 0; transition: height 1.2s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.12}s; box-shadow: 0 6px 20px rgba(128, 24, 54, 0.3);" data-height="${height}">
            <div style="position: absolute; top: -36px; left: 50%; transform: translateX(-50%); white-space: nowrap; font-weight: 700; font-size: 22px; color: ${color}; text-shadow: 0 2px 4px rgba(0,0,0,0.1); letter-spacing: 0.5px;">${area.menciones}</div>
          </div>
        </div>
        <div style="text-align: center; width: 100%;">
          <div style="background: linear-gradient(135deg, ${color}15 0%, ${color}08 100%); padding: 14px; border-radius: 12px; margin-bottom: 12px; border: 1px solid ${color}30;">
            <i class="fas ${area.icon}" style="font-size: 30px; color: ${color}; display: block; text-shadow: 0 2px 4px rgba(0,0,0,0.1);"></i>
          </div>
          <div style="font-size: 14px; font-weight: 700; color: #1a1a1a; line-height: 1.5; margin-bottom: 6px; letter-spacing: 0.2px;">${area.titulo}</div>
          <div style="font-size: 12px; color: #666; font-weight: 500; background: rgba(128, 24, 54, 0.06); padding: 4px 10px; border-radius: 12px; display: inline-block;">${percentage}% del máximo</div>
        </div>
      </div>
    `;
  });
  
  chartHTML += '</div>';
  chartDiv.innerHTML = chartHTML;
  container.appendChild(chartDiv);
  
  // Animar las barras
  setTimeout(() => {
    chartDiv.querySelectorAll('[data-height]').forEach(bar => {
      bar.style.height = bar.getAttribute('data-height') + 'px';
    });
  }, 100);
}

// Función para mostrar sugerencias destacadas
function mostrarSugerenciasDestacadas(sugerencias) {
  const containers = document.querySelectorAll('#propuestas .list-container');
  const container = containers[1]; // Segunda lista: Sugerencias de Mejora Destacadas
  if (!container) {
    console.warn('mostrarSugerenciasDestacadas: No se encontró el contenedor');
    return;
  }
  
  // Limpiar todo el contenido existente
  const ul = container.querySelector('ul');
  if (ul) {
    ul.innerHTML = '';
    ul.style.display = 'none';
  }
  
  // Eliminar todos los elementos de carga y contenedores existentes
  container.querySelectorAll('.loading, .sugerencias-grid-container').forEach(el => el.remove());
  
  if (sugerencias.length === 0) {
    const noData = document.createElement('div');
    noData.style.cssText = 'text-align: center; padding: 40px; color: #666;';
    noData.innerHTML = '<i class="fas fa-info-circle" style="font-size: 2rem; color: #801836; margin-bottom: 12px; display: block;"></i><p style="margin: 0;">No hay sugerencias disponibles</p>';
    container.appendChild(noData);
    return;
  }
  
  const containerDiv = document.createElement('div');
  containerDiv.className = 'sugerencias-grid-container';
  containerDiv.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; margin-top: 24px;';
  
  sugerencias.slice(0, 12).forEach((sugerencia, index) => {
    const sugerenciaEscapada = sugerencia.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const colors = ['#801836', '#9a1f42', '#b4284e', '#ce315a', '#e83966'];
    const color = colors[index % colors.length];
    
    const cardDiv = document.createElement('div');
    cardDiv.style.cssText = 'background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(247, 245, 246, 0.95) 100%); backdrop-filter: blur(10px); border: 1px solid rgba(128, 24, 54, 0.12); padding: 22px; border-radius: 14px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border-left: 4px solid ' + color + '; position: relative; box-shadow: 0 3px 12px rgba(128, 24, 54, 0.08); cursor: pointer;';
    
    // Añadir efectos hover
    cardDiv.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-6px) scale(1.01)';
      this.style.boxShadow = '0 10px 28px rgba(128, 24, 54, 0.18)';
      this.style.borderLeftWidth = '5px';
      this.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(247, 245, 246, 1) 100%)';
    });
    
    cardDiv.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0) scale(1)';
      this.style.boxShadow = '0 3px 12px rgba(128, 24, 54, 0.08)';
      this.style.borderLeftWidth = '4px';
      this.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(247, 245, 246, 0.95) 100%)';
    });
    
    cardDiv.innerHTML = `
      <div style="display: flex; align-items: start; gap: 16px;">
        <div style="background: linear-gradient(135deg, ${color} 0%, ${colors[(index + 1) % colors.length]} 100%); color: white; width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 20px; flex-shrink: 0; box-shadow: 0 4px 14px rgba(128, 24, 54, 0.3); transition: transform 0.3s;">
          <i class="fas fa-lightbulb" style="font-size: 20px;"></i>
        </div>
        <div style="flex: 1;">
          <p style="margin: 0; color: #1a1a1a; font-size: 14px; line-height: 1.75; text-align: justify; font-weight: 400; letter-spacing: 0.1px;">${sugerenciaEscapada}</p>
        </div>
      </div>
    `;
    containerDiv.appendChild(cardDiv);
  });
  
  container.appendChild(containerDiv);
}

// Función para mostrar propuestas temáticas para 2026-27
function mostrarPropuestasTematicas(temas) {
  // Esta función ya está implementada dentro de mostrarAreasMejora
  // Se mantiene aquí para mantener la estructura, pero la lógica está en mostrarAreasMejora
  // que se llama desde updateLists si es necesario
}

// Función para mostrar análisis categorizado
function mostrarAnalisisCategorizado(categorias) {
  const container = document.querySelector('#propuestas .list-container:nth-of-type(3)');
  if (!container) return;
  
  const ul = container.querySelector('ul');
  if (!ul) return;
  
  // Ocultar ul y limpiar contenedores existentes
  ul.style.display = 'none';
  const existingContainer = container.querySelector('.analisis-categorizado-container');
  if (existingContainer) {
    existingContainer.remove();
  }
  
  const analisisDiv = document.createElement('div');
  analisisDiv.className = 'analisis-categorizado-container';
  analisisDiv.style.cssText = 'margin-top: 20px;';
  
  // Ordenar categorías por número de menciones
  const categoriasOrdenadas = Object.values(categorias)
    .filter(cat => cat.menciones.length > 0)
    .sort((a, b) => b.menciones.length - a.menciones.length);
  
  categoriasOrdenadas.forEach(categoria => {
    const categoriaDiv = document.createElement('div');
    categoriaDiv.style.cssText = 'background: rgba(247, 245, 246, 0.8); backdrop-filter: blur(10px); border: 1px solid rgba(128, 24, 54, 0.1); padding: 24px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #801836;';
    
    const headerDiv = document.createElement('div');
    headerDiv.style.cssText = 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;';
    headerDiv.innerHTML = `
      <h4 style="margin: 0; color: #801836; font-size: 18px; font-weight: 700;">${categoria.nombre}</h4>
      <span style="background: linear-gradient(135deg, #801836 0%, #6a1430 100%); color: white; padding: 6px 14px; border-radius: 20px; font-size: 14px; font-weight: 600;">${categoria.menciones.length} ${categoria.menciones.length === 1 ? 'mención' : 'menciones'}</span>
    `;
    categoriaDiv.appendChild(headerDiv);
    
    // Mostrar citas representativas (máximo 4)
    const citasDiv = document.createElement('div');
    citasDiv.style.cssText = 'margin-top: 12px;';
    
    categoria.menciones.slice(0, 4).forEach(cita => {
      const citaDiv = document.createElement('div');
      citaDiv.style.cssText = 'background: rgba(255, 255, 255, 0.6); padding: 12px 16px; border-radius: 8px; margin-bottom: 8px; border-left: 3px solid #801836; font-style: italic; color: #333; font-size: 14px; line-height: 1.5;';
      citaDiv.textContent = `"${cita.substring(0, 200)}${cita.length > 200 ? '...' : ''}"`;
      citasDiv.appendChild(citaDiv);
    });
    
    if (categoria.menciones.length > 4) {
      const masDiv = document.createElement('div');
      masDiv.style.cssText = 'font-size: 12px; color: #666; font-style: italic; margin-top: 8px;';
      masDiv.textContent = `Y ${categoria.menciones.length - 4} ${categoria.menciones.length - 4 === 1 ? 'mención más' : 'menciones más'}`;
      citasDiv.appendChild(masDiv);
    }
    
    categoriaDiv.appendChild(citasDiv);
    analisisDiv.appendChild(categoriaDiv);
  });
  
  container.appendChild(analisisDiv);
}

// Función para mostrar áreas de mejora prioritarias
function mostrarAreasMejora(categorias, temas) {
  const container = document.querySelector('#propuestas .list-container:last-of-type');
  if (!container) return;
  
  const ul = container.querySelector('ul');
  if (!ul) return;
  
  // Ocultar ul y limpiar contenedores existentes
  ul.style.display = 'none';
  const existingContainer = container.querySelector('.areas-mejora-container');
  if (existingContainer) {
    existingContainer.remove();
  }
  
  const areasDiv = document.createElement('div');
  areasDiv.className = 'areas-mejora-container';
  areasDiv.style.cssText = 'margin-top: 20px;';
  
  // Áreas de mejora basadas en las categorías
  const areasMejora = [
    {
      titulo: 'Duración de los talleres',
      descripcion: 'Esta es la preocupación más expresada. Considerar:',
      items: [
        'Extender cada taller de 45 a 60-75 minutos',
        'Reducir el número de talleres simultáneos para permitir sesiones más largas',
        'Organizar el foro en dos días o dos tardes'
      ],
      menciones: categorias.duracion.menciones.length
    },
    {
      titulo: 'Gestión del tiempo',
      descripcion: 'Mejorar la puntualidad y la transición entre actividades.',
      items: [
        'Asegurar que los talleres comiencen puntualmente',
        'Optimizar los tiempos de transición entre sesiones',
        'Aprovechar mejor el tiempo disponible'
      ],
      menciones: categorias.logistica.menciones.length
    },
    {
      titulo: 'Contenido aplicado',
      descripcion: 'Incorporar más elementos prácticos y dinámicas participativas.',
      items: [
        'Reducir la teoría que los docentes ya conocen',
        'Aumentar las dinámicas prácticas',
        'Seleccionar talleres que aporten algo nuevo'
      ],
      menciones: categorias.contenido.menciones.length
    },
    {
      titulo: 'Accesibilidad familiar',
      descripcion: 'Facilitar la asistencia de familias con niños pequeños.',
      items: [
        'Considerar espacio de cuidado infantil',
        'Habilitar un área para que los niños puedan jugar'
      ],
      menciones: categorias.logistica.menciones.filter(s => s.toLowerCase().includes('niño') || s.toLowerCase().includes('niños')).length
    },
    {
      titulo: 'Difusión externa',
      descripcion: 'Ampliar la promoción del evento más allá del personal del colegio.',
      items: [
        'Aumentar la publicidad externa',
        'Atraer a más profesionales externos'
      ],
      menciones: categorias.otros.menciones.filter(s => s.toLowerCase().includes('publicidad')).length
    }
  ];
  
  areasMejora.forEach(area => {
    const areaDiv = document.createElement('div');
    areaDiv.style.cssText = 'background: rgba(247, 245, 246, 0.8); backdrop-filter: blur(10px); border: 1px solid rgba(128, 24, 54, 0.1); padding: 24px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #801836;';
    
    const headerDiv = document.createElement('div');
    headerDiv.style.cssText = 'margin-bottom: 12px;';
    headerDiv.innerHTML = `
      <h4 style="margin: 0 0 8px 0; color: #801836; font-size: 18px; font-weight: 700;">${area.titulo}</h4>
      <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">${area.descripcion}</p>
    `;
    areaDiv.appendChild(headerDiv);
    
    const itemsList = document.createElement('ul');
    itemsList.style.cssText = 'list-style: none; padding: 0; margin: 12px 0 0 0;';
    
    area.items.forEach(item => {
      const li = document.createElement('li');
      li.style.cssText = 'padding: 8px 0 8px 24px; position: relative; color: #333; font-size: 14px; line-height: 1.6;';
      li.innerHTML = `<i class="fas fa-check-circle" style="position: absolute; left: 0; color: #801836; font-size: 14px;"></i> ${item}`;
      itemsList.appendChild(li);
    });
    
    areaDiv.appendChild(itemsList);
    areasDiv.appendChild(areaDiv);
  });
  
  // Propuestas temáticas para 2026-27 basadas en los temas encontrados
  const temasDiv = document.createElement('div');
  temasDiv.style.cssText = 'background: linear-gradient(135deg, rgba(128, 24, 54, 0.1) 0%, rgba(106, 20, 48, 0.1) 100%); border: 2px solid #801836; padding: 24px; border-radius: 12px; margin-top: 20px;';
  
  // Categorizar temas encontrados
  const temasEmocionales = Object.entries(temas).filter(([t, c]) => 
    t.includes('emocional') || t.includes('salud mental') || t.includes('bienestar') || 
    t.includes('ansiedad') || t.includes('depresión') || t.includes('sentimientos') ||
    t.includes('emociones') || t.includes('convivencia') || t.includes('valores')
  );
  
  const temasIA = Object.entries(temas).filter(([t, c]) => 
    t.includes('inteligencia artificial') || t.includes('ia') || t.includes('tecnología') ||
    t.includes('digital') || t.includes('innovación tecnológica')
  );
  
  const temasFamilia = Object.entries(temas).filter(([t, c]) => 
    t.includes('familia') || t.includes('escuela-familia') || t.includes('cohesión') ||
    t.includes('relación') || t.includes('vínculo') || t.includes('padres')
  );
  
  const temasDiversidad = Object.entries(temas).filter(([t, c]) => 
    t.includes('diversidad') || t.includes('inclusión') || t.includes('inclusivo') ||
    t.includes('atención') || t.includes('dificultades') || t.includes('tea') || t.includes('tdha')
  );
  
  const temasOtros = Object.entries(temas).filter(([t, c]) => 
    !temasEmocionales.some(([te, ce]) => te === t) &&
    !temasIA.some(([te, ce]) => te === t) &&
    !temasFamilia.some(([te, ce]) => te === t) &&
    !temasDiversidad.some(([te, ce]) => te === t)
  );
  
  let temasHTML = `
    <h4 style="margin: 0 0 16px 0; color: #801836; font-size: 20px; font-weight: 700;">Propuestas Temáticas para 2026-27</h4>
    <p style="margin: 0 0 16px 0; color: #333; font-size: 14px; line-height: 1.6;">Basándose en las solicitudes de los participantes, el siguiente foro debería centrarse prioritariamente en:</p>
    <ul style="list-style: none; padding: 0; margin: 0;">
  `;
  
  // Educación emocional (la más demandada)
  if (temasEmocionales.length > 0) {
    const totalEmocional = temasEmocionales.reduce((sum, [t, c]) => sum + c, 0);
    temasHTML += `
      <li style="padding: 12px 0 12px 32px; position: relative; color: #333; font-size: 15px; font-weight: 600; margin-bottom: 8px; background: rgba(255, 255, 255, 0.5); border-radius: 8px;">
        <i class="fas fa-heart" style="position: absolute; left: 8px; color: #801836; font-size: 18px;"></i>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>Educación emocional y salud mental</span>
          <span style="background: linear-gradient(135deg, #801836 0%, #6a1430 100%); color: white; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">${totalEmocional} menciones</span>
        </div>
      </li>
    `;
  }
  
  // IA
  if (temasIA.length > 0) {
    const totalIA = temasIA.reduce((sum, [t, c]) => sum + c, 0);
    temasHTML += `
      <li style="padding: 12px 0 12px 32px; position: relative; color: #333; font-size: 15px; font-weight: 600; margin-bottom: 8px; background: rgba(255, 255, 255, 0.5); border-radius: 8px;">
        <i class="fas fa-robot" style="position: absolute; left: 8px; color: #801836; font-size: 18px;"></i>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>Inteligencia artificial en educación (con diferentes niveles, desde principiantes hasta avanzados)</span>
          <span style="background: linear-gradient(135deg, #801836 0%, #6a1430 100%); color: white; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">${totalIA} menciones</span>
        </div>
      </li>
    `;
  }
  
  // Familia
  if (temasFamilia.length > 0) {
    const totalFamilia = temasFamilia.reduce((sum, [t, c]) => sum + c, 0);
    temasHTML += `
      <li style="padding: 12px 0 12px 32px; position: relative; color: #333; font-size: 15px; font-weight: 600; margin-bottom: 8px; background: rgba(255, 255, 255, 0.5); border-radius: 8px;">
        <i class="fas fa-users" style="position: absolute; left: 8px; color: #801836; font-size: 18px;"></i>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>Relación escuela-familia y cohesión educativa</span>
          <span style="background: linear-gradient(135deg, #801836 0%, #6a1430 100%); color: white; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">${totalFamilia} menciones</span>
        </div>
      </li>
    `;
  }
  
  // Diversidad
  if (temasDiversidad.length > 0) {
    const totalDiversidad = temasDiversidad.reduce((sum, [t, c]) => sum + c, 0);
    temasHTML += `
      <li style="padding: 12px 0 12px 32px; position: relative; color: #333; font-size: 15px; font-weight: 600; margin-bottom: 8px; background: rgba(255, 255, 255, 0.5); border-radius: 8px;">
        <i class="fas fa-handshake" style="position: absolute; left: 8px; color: #801836; font-size: 18px;"></i>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>Atención a la diversidad e inclusión educativa</span>
          <span style="background: linear-gradient(135deg, #801836 0%, #6a1430 100%); color: white; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">${totalDiversidad} menciones</span>
        </div>
      </li>
    `;
  }
  
  temasHTML += `
    </ul>
    <p style="margin: 16px 0 0 0; color: #666; font-size: 13px; font-style: italic; line-height: 1.6;">Estas temáticas podrían integrarse en un enfoque transversal que aborde el bienestar integral de estudiantes, familias y educadores en el contexto educativo actual.</p>
  `;
  
  temasDiv.innerHTML = temasHTML;
  areasDiv.appendChild(temasDiv);
  container.appendChild(areasDiv);
}

// Función para generar y descargar CSVs con feedback visual
function generarCSV(tipo) {
  // Encontrar el botón que activó la descarga
  const button = document.querySelector(`button[onclick*="generarCSV('${tipo}')"]`) || 
                 document.querySelector(`[data-file="${tipo}"] button`) ||
                 document.querySelector(`[data-file="${tipo}"] .download-button`);
  
  let originalHTML = '';
  let originalBg = '';
  
  // Agregar feedback visual inicial
  if (button) {
    originalHTML = button.innerHTML;
    originalBg = button.style.background || '';
    
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
    button.style.background = 'linear-gradient(135deg, #ffc107 0%, #ffb300 100%)';
    button.style.cursor = 'wait';
    button.disabled = true;
  }
  
  let csvContent = '';
  let filename = '';
  
  switch(tipo) {
    case 'resumen':
      csvContent = 'Métrica,Valor\n';
      csvContent += `Acreditados,${acreditacionesData.length}\n`;
      csvContent += `Asistentes,${asistenciaData.length}\n`;
      csvContent += `Tasa Asistencia,${((asistenciaData.length / acreditacionesData.length) * 100).toFixed(1)}%\n`;
      csvContent += `Valoraciones,${respuestasData.length}\n`;
      csvContent += `Tasa Respuesta,${((respuestasData.length / asistenciaData.length) * 100).toFixed(1)}%\n`;
      const totalRating = respuestasData.reduce((sum, row) => {
        const rating = parseFloat(row['¿En qué grado recomendarías el Foro de Innovación Educativa?']);
        return sum + (isNaN(rating) ? 0 : rating);
      }, 0);
      const ratingCount = respuestasData.filter(row => !isNaN(parseFloat(row['¿En qué grado recomendarías el Foro de Innovación Educativa?']))).length;
      csvContent += `Valoración Media,${ratingCount > 0 ? (totalRating / ratingCount).toFixed(2) : '0.00'}\n`;
      filename = 'Resumen_General.csv';
      break;
      
    case 'roles':
      csvContent = 'Rol,Acreditados,Asistentes,Tasa Asistencia\n';
      const rolesAcreditados = {};
      const rolesAsistentes = {};
      acreditacionesData.forEach(row => {
        const rol = row.Rol || 'Sin especificar';
        rolesAcreditados[rol] = (rolesAcreditados[rol] || 0) + 1;
      });
      asistenciaData.forEach(row => {
        const rol = row.Rol || 'Sin especificar';
        rolesAsistentes[rol] = (rolesAsistentes[rol] || 0) + 1;
      });
      const roles = [...new Set([...Object.keys(rolesAcreditados), ...Object.keys(rolesAsistentes)])];
      roles.forEach(rol => {
        const acreditados = rolesAcreditados[rol] || 0;
        const asistentes = rolesAsistentes[rol] || 0;
        const tasa = acreditados > 0 ? ((asistentes / acreditados) * 100).toFixed(1) : 0;
        csvContent += `${rol},${acreditados},${asistentes},${tasa}%\n`;
      });
      filename = 'Comparacion_Roles.csv';
      break;
      
    case 'talleres1730':
      csvContent = 'Taller,Asistentes\n';
      const talleres1730 = {};
      asistenciaData.forEach(row => {
        const taller = row['17:30']?.trim();
        if (taller && taller !== 'Primera sesión' && taller !== '') {
          const nombreTaller = extractTallerName(taller);
          talleres1730[nombreTaller] = (talleres1730[nombreTaller] || 0) + 1;
        }
      });
      Object.entries(talleres1730).sort((a, b) => b[1] - a[1]).forEach(([taller, count]) => {
        csvContent += `"${taller}",${count}\n`;
      });
      filename = 'Talleres_1730.csv';
      break;
      
    case 'talleres1830':
      csvContent = 'Taller,Asistentes\n';
      const talleres1830 = {};
      asistenciaData.forEach(row => {
        const taller = row['18:30']?.trim();
        if (taller && taller !== 'Segunda sesión' && taller !== '') {
          const nombreTaller = extractTallerName(taller);
          talleres1830[nombreTaller] = (talleres1830[nombreTaller] || 0) + 1;
        }
      });
      Object.entries(talleres1830).sort((a, b) => b[1] - a[1]).forEach(([taller, count]) => {
        csvContent += `"${taller}",${count}\n`;
      });
      filename = 'Talleres_1830.csv';
      break;
      
    case 'perfil':
      csvContent = 'Perfil,Cantidad,Porcentaje\n';
      const perfiles = {};
      respuestasData.forEach(row => {
        const perfil = row['Soy...']?.trim();
        if (perfil) {
          perfiles[perfil] = (perfiles[perfil] || 0) + 1;
        }
      });
      const totalPerfiles = Object.values(perfiles).reduce((sum, val) => sum + val, 0);
      Object.entries(perfiles).sort((a, b) => b[1] - a[1]).forEach(([perfil, count]) => {
        const porcentaje = totalPerfiles > 0 ? ((count / totalPerfiles) * 100).toFixed(1) : 0;
        csvContent += `"${perfil}",${count},${porcentaje}%\n`;
      });
      filename = 'Perfil_Encuestados.csv';
      break;
      
    case 'valoraciones':
      csvContent = 'Valoración,Cantidad,Porcentaje\n';
      const ratings = {};
      respuestasData.forEach(row => {
        const rating = row['¿En qué grado recomendarías el Foro de Innovación Educativa?'];
        if (rating && !isNaN(parseFloat(rating))) {
          const r = parseFloat(rating);
          ratings[r] = (ratings[r] || 0) + 1;
        }
      });
      const totalRatings = Object.values(ratings).reduce((sum, val) => sum + val, 0);
      Object.entries(ratings).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0])).forEach(([rating, count]) => {
        const porcentaje = totalRatings > 0 ? ((count / totalRatings) * 100).toFixed(1) : 0;
        csvContent += `${rating},${count},${porcentaje}%\n`;
      });
      filename = 'Valoraciones_Resumen.csv';
      break;
      
    case 'tematicas':
      csvContent = 'Temática,Cantidad,Porcentaje\n';
      const temas = {};
      respuestasData.forEach(row => {
        const tema = row['¿Sobre qué temática te gustaría que girara el Foro de Innovación del curso 26-27?']?.trim();
        if (tema && tema.length > 3) {
          const temaNormalizado = tema.toLowerCase().trim();
          temas[temaNormalizado] = (temas[temaNormalizado] || 0) + 1;
        }
      });
      const totalTemas = Object.values(temas).reduce((sum, val) => sum + val, 0);
      Object.entries(temas).sort((a, b) => b[1] - a[1]).forEach(([tema, count]) => {
        const porcentaje = totalTemas > 0 ? ((count / totalTemas) * 100).toFixed(1) : 0;
        csvContent += `"${tema}",${count},${porcentaje}%\n`;
      });
      filename = 'Tematicas_Propuestas.csv';
      break;
      
    case 'sugerencias':
      csvContent = 'Categoría,Sugerencia\n';
      const sugerencias = [];
      respuestasData.forEach(row => {
        const sugerencia = row['¿Tienes alguna sugerencia, propuesta o mejora que te gustaría compartir?']?.trim();
        if (sugerencia && sugerencia.length > 10) {
          sugerencias.push(sugerencia);
        }
      });
      const categorias = analizarSugerencias(sugerencias);
      Object.values(categorias).forEach(categoria => {
        categoria.menciones.forEach(mencion => {
          csvContent += `"${categoria.nombre}","${mencion.replace(/"/g, '""')}"\n`;
        });
      });
      filename = 'Sugerencias_Agrupadas.csv';
      break;
      
    default:
      return;
  }
  
  // Crear y descargar el archivo
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  // Efecto visual de confirmación mejorado
  if (button && originalHTML) {
    button.innerHTML = '<i class="fas fa-check"></i> ¡Descargado!';
    button.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
    button.style.cursor = 'pointer';
    
    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.style.background = originalBg || '';
      button.disabled = false;
    }, 2000);
  }
}

// Agregar efectos hover mejorados a las tarjetas de descarga
function mejorarTarjetasDescarga() {
  const downloadCards = document.querySelectorAll('.download-card');
  downloadCards.forEach(card => {
    card.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    card.style.cursor = 'pointer';
    
    card.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-5px) scale(1.02)';
      this.style.boxShadow = '0 8px 24px rgba(128, 24, 54, 0.15)';
      const icon = this.querySelector('div[style*="background: linear-gradient"]');
      if (icon) {
        icon.style.transform = 'rotate(5deg) scale(1.1)';
      }
    });
    
    card.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0) scale(1)';
      this.style.boxShadow = '';
      const icon = this.querySelector('div[style*="background: linear-gradient"]');
      if (icon) {
        icon.style.transform = 'rotate(0) scale(1)';
      }
    });
  });
}

// Función para añadir tooltips a elementos
function addTooltip(element, text) {
  if (!element || !text) return;
  
  element.setAttribute('title', text);
  element.setAttribute('aria-label', text);
  
  // Crear tooltip personalizado si se desea
  element.addEventListener('mouseenter', function(e) {
    const tooltip = document.createElement('div');
    tooltip.className = 'custom-tooltip';
    tooltip.textContent = text;
    tooltip.style.cssText = `
      position: absolute;
      background: rgba(26, 26, 26, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 0.875rem;
      pointer-events: none;
      z-index: 10000;
      white-space: nowrap;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      opacity: 0;
      transition: opacity 0.2s;
    `;
    document.body.appendChild(tooltip);
    
    const rect = element.getBoundingClientRect();
    tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
    tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + 'px';
    
    setTimeout(() => {
      tooltip.style.opacity = '1';
    }, 10);
    
    element._tooltip = tooltip;
  });
  
  element.addEventListener('mouseleave', function() {
    if (element._tooltip) {
      element._tooltip.style.opacity = '0';
      setTimeout(() => {
        if (element._tooltip && element._tooltip.parentNode) {
          element._tooltip.parentNode.removeChild(element._tooltip);
        }
        element._tooltip = null;
      }, 200);
    }
  });
}

// Función para mejorar accesibilidad
function improveAccessibility() {
  // Añadir aria-labels a botones de navegación
  navButtons.forEach(button => {
    const sectionId = button.getAttribute('data-section');
    const sectionName = button.textContent.trim();
    button.setAttribute('aria-label', `Ir a la sección ${sectionName}`);
    button.setAttribute('role', 'tab');
  });
  
  // Añadir roles ARIA a las secciones
  sections.forEach(section => {
    section.setAttribute('role', 'tabpanel');
    const sectionId = section.id;
    const correspondingButton = document.querySelector(`[data-section="${sectionId}"]`);
    if (correspondingButton) {
      section.setAttribute('aria-labelledby', correspondingButton.id || sectionId + '-tab');
    }
  });
  
  // Añadir tooltips a las tarjetas de métricas
  const metricCards = document.querySelectorAll('.metric-card');
  metricCards.forEach(card => {
    const label = card.querySelector('.metric-label')?.textContent;
    if (label) {
      addTooltip(card, `Ver detalles de ${label}`);
    }
  });
}

// Función para manejar el botón de scroll to top
function initScrollToTop() {
  const scrollButton = document.getElementById('scrollToTop');
  if (!scrollButton) return;
  
  // Mostrar/ocultar botón según scroll
  window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
      scrollButton.classList.add('visible');
    } else {
      scrollButton.classList.remove('visible');
    }
  }, { passive: true });
  
  // Scroll suave al hacer clic
  scrollButton.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  showSection('resumen');
  loadData();
  mejorarTarjetasDescarga();
  improveAccessibility();
  initScrollToTop();
});

