const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cinestock-test-'));
for (const file of ['users.json', 'gear.json', 'checkouts.json']) {
  fs.copyFileSync(
    path.join(__dirname, '..', 'src', 'data', file),
    path.join(dataDir, file)
  );
}
process.env.CINESTOCK_DATA_DIR = dataDir;

const app = require('../src/app');

function dateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function login(matricula, password) {
  const agent = request.agent(app);
  return agent
    .post('/api/auth/login')
    .send({ matricula, password })
    .then(response => ({ agent, response }));
}

describe('CineStock API', () => {
  let alumno;
  let panolero;
  let director;

  beforeAll(async () => {
    alumno = (await login('2025-1001', 'cine123')).agent;
    panolero = (await login('ADMIN-001', 'panol2026')).agent;
    director = (await login('DIR-001', 'director2026')).agent;
  });

  afterAll(() => {
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  describe('Autenticacion', () => {
    test('rechaza credenciales invalidas', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ matricula: '2025-1001', password: 'incorrecta' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    test('devuelve el usuario autenticado sin password', async () => {
      const response = await alumno.get('/api/auth/me');

      expect(response.status).toBe(200);
      expect(response.body.user.matricula).toBe('2025-1001');
      expect(response.body.user.password).toBeUndefined();
    });
  });

  describe('Catalogo', () => {
    test('requiere sesion', async () => {
      const response = await request(app).get('/api/gear');
      expect(response.status).toBe(401);
    });

    test('filtra por categoria y disponibilidad', async () => {
      const camaras = await alumno.get('/api/gear?categoria=camara');
      expect(camaras.status).toBe(200);
      expect(camaras.body.length).toBeGreaterThan(0);
      camaras.body.forEach(equipo => expect(equipo.categoria).toBe('camara'));

      const disponibles = await alumno.get('/api/gear?disponible=true');
      disponibles.body.forEach(equipo => expect(equipo.estado).toBe('disponible'));
    });

    test('incluye fechas ocupadas en el catalogo', async () => {
      const response = await alumno.get('/api/gear');
      expect(Array.isArray(response.body[0].ocupiedDates)).toBe(true);
    });
  });

  describe('Permisos', () => {
    test('el alumno no puede listar usuarios', async () => {
      const response = await alumno.get('/api/users');
      expect(response.status).toBe(403);
    });

    test('el alumno no puede acceder al panel de administracion', async () => {
      const response = await alumno.get('/api/admin/checkouts');
      expect(response.status).toBe(403);
    });

    test('el panolero y el director pueden ver la mora', async () => {
      expect((await panolero.get('/api/admin/reportes/mora')).status).toBe(200);
      expect((await director.get('/api/admin/reportes/mora')).status).toBe(200);
    });
  });

  describe('Reservas', () => {
    test('el alumno solo ve sus reservas', async () => {
      const response = await alumno.get('/api/checkouts');
      expect(response.status).toBe(200);
      response.body.forEach(reserva => expect(reserva.userId).toBe('u-001'));
    });

    test('crea una reserva valida', async () => {
      const response = await alumno
        .post('/api/checkouts')
        .send({
          items: ['g-005', 'g-007'],
          fechaRetiro: dateOffset(10),
          fechaDevolucion: dateOffset(12)
        });

      expect(response.status).toBe(201);
      expect(response.body.estado).toBe('reservado');
    });

    test('rechaza mas de 5 equipos', async () => {
      const response = await alumno
        .post('/api/checkouts')
        .send({
          items: ['g-001', 'g-004', 'g-005', 'g-006', 'g-007', 'g-010'],
          fechaRetiro: dateOffset(20),
          fechaDevolucion: dateOffset(22)
        });

      expect(response.status).toBe(400);
    });

    test('rechaza equipos duplicados', async () => {
      const response = await alumno
        .post('/api/checkouts')
        .send({
          items: ['g-005', 'g-005'],
          fechaRetiro: dateOffset(20),
          fechaDevolucion: dateOffset(22)
        });

      expect(response.status).toBe(400);
    });

    test('rechaza equipos que superan el anio del alumno', async () => {
      const response = await alumno
        .post('/api/checkouts')
        .send({
          items: ['g-002'],
          fechaRetiro: dateOffset(20),
          fechaDevolucion: dateOffset(22)
        });

      expect(response.status).toBe(400);
    });

    test('rechaza fechas superpuestas para el mismo equipo', async () => {
      const payload = {
        items: ['g-005'],
        fechaRetiro: dateOffset(30),
        fechaDevolucion: dateOffset(32)
      };

      expect((await alumno.post('/api/checkouts').send(payload)).status).toBe(201);
      expect((await alumno.post('/api/checkouts').send(payload)).status).toBe(400);
    });

    test('permite cancelar una reserva con mas de 24 horas', async () => {
      const creada = await alumno
        .post('/api/checkouts')
        .send({
          items: ['g-004'],
          fechaRetiro: dateOffset(40),
          fechaDevolucion: dateOffset(42)
        });

      const cancelada = await alumno.delete('/api/checkouts/' + creada.body.id);
      expect(cancelada.status).toBe(200);
      expect(cancelada.body.estado).toBe('cancelado');
    });

    test('no permite cancelar una reserva con menos de 24 horas', async () => {
      const creada = await alumno
        .post('/api/checkouts')
        .send({
          items: ['g-010'],
          fechaRetiro: dateOffset(1),
          fechaDevolucion: dateOffset(3)
        });

      const cancelada = await alumno.delete('/api/checkouts/' + creada.body.id);
      expect(cancelada.status).toBe(400);
    });
  });

  describe('Dashboard del director', () => {
    test('el director obtiene el dashboard completo', async () => {
      const response = await director.get('/api/director/dashboard');

      expect(response.status).toBe(200);
      expect(response.body.stats.total).toBe(20);
      expect(Array.isArray(response.body.mostDemanded)).toBe(true);
      expect(Array.isArray(response.body.mora)).toBe(true);
      expect(response.body.porCategoria).toBeDefined();
      expect(Array.isArray(response.body.equiposFueraServicio)).toBe(true);
      expect(response.body.demandaPorEquipo).toBeDefined();
    });

    test('el director genera el reporte general', async () => {
      const response = await director.get('/api/director/reportes');

      expect(response.status).toBe(200);
      expect(response.body.generatedAt).toBeDefined();
      expect(response.body.totalReservas).toBeGreaterThan(0);
      expect(Array.isArray(response.body.mostDemanded)).toBe(true);
    });

    test('solo el director puede acceder al dashboard', async () => {
      expect((await alumno.get('/api/director/dashboard')).status).toBe(403);
      expect((await panolero.get('/api/director/dashboard')).status).toBe(403);
      expect((await request(app).get('/api/director/dashboard')).status).toBe(401);
    });
  });

  describe('Panel del panolero', () => {
    test('entrega y devuelve una reserva actualizando el inventario', async () => {
      const entrega = await panolero
        .put('/api/admin/checkouts/co-001/status')
        .send({ estado: 'entregado' });

      expect(entrega.status).toBe(200);
      expect(entrega.body.estado).toBe('entregado');

      const prestado = await alumno.get('/api/gear/g-001');
      expect(prestado.body.estado).toBe('prestado');

      const devolucion = await panolero
        .put('/api/admin/checkouts/co-001/status')
        .send({ estado: 'devuelto_ok' });

      expect(devolucion.status).toBe(200);
      expect(devolucion.body.estado).toBe('devuelto_ok');

      const disponible = await alumno.get('/api/gear/g-001');
      expect(disponible.body.estado).toBe('disponible');
    });

    test('envia notificaciones al alumno', async () => {
      const mensaje = 'Falta devolver el cable HDMI.';

      const notificacion = await panolero
        .post('/api/admin/checkouts/co-001/notify')
        .send({ mensaje });

      expect(notificacion.status).toBe(200);

      const reservas = await alumno.get('/api/checkouts');
      const reserva = reservas.body.find(item => item.id === 'co-001');
      expect(reserva.notificaciones).toContain(mensaje);
    });

    test('rechaza notificaciones vacias', async () => {
      const response = await panolero
        .post('/api/admin/checkouts/co-001/notify')
        .send({ mensaje: '   ' });

      expect(response.status).toBe(400);
    });

    test('envia un equipo a reparacion', async () => {
      const response = await panolero
        .put('/api/admin/checkouts/co-002/status')
        .send({ estado: 'reparacion', notas: 'Lente con hongo.' });

      expect(response.status).toBe(200);
      expect(response.body.estado).toBe('reparacion');

      const equipo = await alumno.get('/api/gear/g-002');
      expect(equipo.body.estado).toBe('mantenimiento');
    });
  });
});
