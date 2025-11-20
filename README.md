# XIV Foro de Innovación Educativa - Análisis de Resultados

Aplicación web para el análisis y visualización de datos del **XIV Foro de Innovación Educativa - HUMANIA: Desafío Educativo**.

## 📋 Descripción

Esta aplicación permite analizar y visualizar los datos recopilados del XIV Foro de Innovación Educativa, incluyendo:

- **Resumen ejecutivo** con métricas clave (acreditados, asistentes, tasas, valoraciones)
- **Análisis de talleres** con valoraciones y comparativas
- **Valoraciones y NPS** (Net Promoter Score)
- **Propuestas y sugerencias** categorizadas
- **Listados de asistentes y no asistentes** con filtros
- **Balance y análisis comparativo** con el Foro XIII

## 🚀 Características

- ✅ Visualización interactiva de datos
- ✅ Análisis estadístico completo
- ✅ Exportación de datos a CSV
- ✅ Comparativa con años anteriores
- ✅ Filtros avanzados para listados
- ✅ Diseño responsive
- ✅ Accesibilidad mejorada

## 📁 Estructura de Archivos

```
analisisforo/
├── index.html              # Estructura HTML principal
├── app.js                  # Lógica de la aplicación
├── styles.css             # Estilos CSS
├── CSV - Acreditaciones.csv
├── CSV - Asistencia.csv
├── XIV Foro de Innovación Educativa (respuestas) - Respuestas de formulario 1.csv
├── BALANCE XIII FORO DE INNOVACIÓN (nov 2024).xlsx
└── README.md              # Este archivo
```

## 🔧 Requisitos

- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- Servidor web local (opcional, para desarrollo)
- Archivos CSV con los datos del foro

## 📦 Instalación y Uso

### Opción 1: Servidor Local

1. Coloca todos los archivos en una carpeta
2. Inicia un servidor HTTP local:
   ```bash
   # Con Python 3
   python3 -m http.server 8000
   
   # Con Node.js (http-server)
   npx http-server
   
   # Con PHP
   php -S localhost:8000
   ```
3. Abre `http://localhost:8000` en tu navegador

### Opción 2: Abrir Directamente

Simplemente abre `index.html` en tu navegador (puede tener limitaciones con CORS).

## 📊 Secciones Disponibles

### 1. Resumen
- Métricas principales del foro
- Net Promoter Score (NPS)
- Distribución por roles
- Gráficos comparativos

### 2. Talleres
- Análisis de talleres por horario (17:30 y 18:30)
- Valoraciones por taller
- Comparativas de asistencia

### 3. Valoración
- Distribución de valoraciones
- Valoración media
- Análisis de la charla inspiracional

### 4. Propuestas
- Temáticas identificadas
- Sugerencias de mejora
- Categorización automática

### 5. Asistentes
- Listado completo de asistentes
- Filtros por institución y tipo de docente
- Búsqueda de texto

### 6. No Asistentes
- Listado de personas acreditadas que no asistieron
- Análisis de causas potenciales

### 7. Balance y Análisis
- Comparativa con el Foro XIII
- Evolución de métricas clave
- Análisis de tendencias

### 8. Archivos
- Descarga de datos procesados en CSV
- Exportación de resúmenes y análisis

## 🔍 Funcionalidades Técnicas

### Cálculo del NPS
El Net Promoter Score se calcula usando la metodología estándar:
- Conversión de escala 1-5 a 0-10: `(valor - 1) * 2.5`
- Clasificación:
  - **Promotores**: 9-10 (rating 5)
  - **Pasivos**: 7-8 (rating 4)
  - **Detractores**: 0-6 (ratings 1-3)
- Fórmula: `NPS = % Promotores - % Detractores`

### Validación de Datos
- Validación de archivos CSV vacíos
- Filtrado de filas vacías
- Manejo de errores con mensajes informativos
- Validación de formato de datos

### Exportación
- Generación de CSV con datos procesados
- Exportación de resúmenes ejecutivos
- Descarga de listados filtrados

## 🎨 Personalización

### Colores Principales
- Granate: `#801836`
- Granate claro: `#9a1f42`
- Verde éxito: `#28a745`
- Amarillo advertencia: `#ffc107`
- Rojo error: `#dc3545`

### Fuentes
- Font Awesome 6.5.1 (iconos)
- Fuentes del sistema

## 📝 Notas Importantes

1. **Datos del Foro XIII**: Los datos del año anterior están hardcodeados en `app.js` (línea ~2728). Actualiza estos valores según los datos reales del balance.

2. **Archivos CSV**: Asegúrate de que los archivos CSV estén en la misma carpeta que `index.html` y tengan los nombres exactos especificados en el código.

3. **Compatibilidad**: La aplicación funciona mejor en navegadores modernos. Para Internet Explorer, se requiere polyfills adicionales.

4. **CORS**: Si abres el archivo directamente (file://), algunos navegadores pueden bloquear la carga de CSV por políticas CORS. Usa un servidor local.

## 🐛 Solución de Problemas

### Los datos no se cargan
- Verifica que los archivos CSV estén en la misma carpeta
- Comprueba la consola del navegador para errores
- Asegúrate de usar un servidor HTTP local

### Los gráficos no aparecen
- Verifica que Font Awesome esté cargando correctamente
- Comprueba la consola para errores JavaScript
- Asegúrate de que los datos se hayan cargado correctamente

### Los filtros no funcionan
- Verifica que JavaScript esté habilitado
- Comprueba que los datos se hayan procesado correctamente
- Revisa la consola para errores

## 📅 Versión

**Versión actual**: 1.0.0  
**Fecha**: Noviembre 2025  
**Foro**: XIV Foro de Innovación Educativa - HUMANIA

## 👥 Créditos

- **Desarrollado para**: Colegio Santa María la Blanca
- **Equipo**: Equipo organizador del XIV Foro de Innovación Educativa
- **Datos**: Basado en respuestas y asistencia del XIV Foro

## 📄 Licencia

Este proyecto es de uso interno del Colegio Santa María la Blanca.

## 🔄 Actualizaciones Futuras

- [ ] Integración con bases de datos
- [ ] Exportación a PDF
- [ ] Gráficos interactivos con Chart.js o D3.js
- [ ] Panel de administración
- [ ] Autenticación de usuarios
- [ ] Historial de versiones de datos

---

**Última actualización**: Noviembre 2025

