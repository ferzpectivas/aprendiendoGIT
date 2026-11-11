# Anotaciones del proyecto CineStock

Índice y registro de decisiones de la documentación del proyecto.

## Documentación de referencia

- [Relevamiento funcional](./relevamiento/relevamiento-funcional.md)
- [Caso de estudio 8](./relevamiento/caso-de-estudio-8.pdf)
- [Actividad individual de relevamiento](./relevamiento/actividad-individual-relevamiento.docx)

## Entregas anteriores

### Entrega parcial 1

- [Informe de entrega parcial 1](./entregas/entrega-1/grupo4-entrega-parcial-1.pdf)
- [Aportes individuales](./entregas/entrega-1/aportes/)
- [Prototipo de pantalla de reserva](./entregas/entrega-1/prototipo/reserva.html)

## Decisiones de organización

- El repositorio es un monorepo con dos proyectos: `backend/` y `frontend/`.
- El backend es una API REST en Node.js + Express.
- El frontend es estático (HTML, CSS y JavaScript vanilla).
- Para simplificar el despliegue y conservar las sesiones, Express sirve el contenido de `frontend/` en el mismo origen que la API.
- La persistencia se mantiene en archivos JSON dentro de `backend/src/data/`.
- El despliegue previsto es un único servicio web en Render, configurado mediante `render.yaml`.

## Diagramas

La carpeta [`diagramas/`](./diagramas/) queda reservada para los diagramas del proyecto.
