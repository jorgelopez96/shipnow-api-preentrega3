# ShipNow API

API de una plataforma de logística hecha con **Node.js**, **Express** (ES Modules) y **MongoDB + Mongoose**.

Esta entrega (pre-entrega del Módulo 2) suma un **módulo de mocking** para generar usuarios, repartidores, pedidos y entregas de prueba sin cargarlos a mano, respetando la arquitectura por capas.

## Instalación

Requisitos: Node.js 18 o superior y una base MongoDB (local o en Atlas).

```bash
git clone <url-del-repo>
cd <carpeta-del-repo>
npm install
cp .env.example .env   # después completá los valores
```

## Variables de entorno

| Variable      | Obligatoria | Default       | Descripción                                          |
| ------------- | ----------- | ------------- | ---------------------------------------------------- |
| `MONGODB_URI` | Sí          | -             | Cadena de conexión a MongoDB                         |
| `NODE_ENV`    | Sí          | `development` | Con `production` se desactivan las rutas de mocks    |
| `PORT`        | No          | `8080`        | Puerto del servidor                                  |

Si falta una variable obligatoria, la app no arranca y muestra cuál falta. Solo `src/config/index.js` lee `process.env`.

## Cómo correr

```bash
npm run dev   # desarrollo, con nodemon
npm start     # node server.js
```

## Estructura por capas

```
server.js              Conecta a MongoDB y levanta el servidor
src/
├── app.js             Express, routers y middleware de errores
├── config/            Variables de entorno validadas
├── constants/         Roles, estados, prioridades y límites
├── routes/            Solo definen rutas y delegan al controller
├── controllers/       Reciben req/res, llaman al service y responden (errores → next)
├── services/          Lógica de negocio (no conocen req ni res)
├── repositories/      Única capa que habla con Mongoose
├── models/            Schemas de User, Order y Delivery
├── mocks/             Generadores de datos falsos con @faker-js/faker (locale es)
└── utils/             Error de app, middleware de errores, hash de contraseñas, total del pedido
```

Flujo: **Router → Controller → Service → Repository → Model**. Ninguna capa se saltea a otra.

## Endpoints de mocking

El router `/api/mocks` solo se monta si `NODE_ENV` **no** es `production`.

### Datos simulados (no se guardan en la base)

Todos aceptan `?qty=N`: un entero de 1 a 100, y si no se manda, se generan 10.

| Método | Ruta                       | Devuelve                                      |
| ------ | -------------------------- | --------------------------------------------- |
| GET    | `/api/mocks/users`         | Usuarios con cualquier rol válido             |
| GET    | `/api/mocks/mockingusers`  | Alias de `/users`                             |
| GET    | `/api/mocks/drivers`       | Usuarios con rol `driver` e `isAvailable`     |
| GET    | `/api/mocks/orders`        | Pedidos con items, total, estado y prioridad  |
| GET    | `/api/mocks/mockingorders` | Alias de `/orders`                            |
| GET    | `/api/mocks/deliveries`    | Entregas asociadas a un pedido                |

Ejemplo: `GET /api/mocks/users?qty=2`

```json
[
  {
    "_id": "1f4bf32a0be0c5fccb96abea",
    "firstName": "Teodoro",
    "lastName": "Lomeli Delgado",
    "email": "teodoro.lomelidelgado.mvd9p08l0@shipnow.test",
    "role": "driver",
    "isAvailable": true
  },
  {
    "_id": "ab1bb3fd0fd5aabdacc4943b",
    "firstName": "Juan Ramón",
    "lastName": "Mercado Juárez",
    "email": "juanramon.mercadojuarez.mvd9p0fs0@shipnow.test",
    "role": "admin"
  }
]
```

Ejemplo: `GET /api/mocks/orders?qty=1`

```json
[
  {
    "_id": "ce356d1fae1e1c8089b22c03",
    "customer": "9a81771fc7e9a042c6e70781",
    "items": [{ "name": "Coche Pequeño de Ladrillo", "quantity": 2, "price": 41808.35 }],
    "deliveryAddress": "Carretera Isabel s/n., Tarrasa",
    "total": 83616.7,
    "status": "assigned",
    "priority": "low"
  }
]
```

Ejemplo: `GET /api/mocks/deliveries?qty=1`

```json
[
  {
    "_id": "465969f02bcf5aaede5efd23",
    "order": "c3fdbacc99dda46bf8fd138b",
    "status": "assigned",
    "priority": "high",
    "driver": "fb18ae6ff1df1ceacaf0dc2d"
  }
]
```

Las respuestas de usuarios nunca incluyen la contraseña.

### Carga de datos de prueba (se guardan en MongoDB)

| Método | Ruta                       |
| ------ | -------------------------- |
| POST   | `/api/mocks/seed`          |
| POST   | `/api/mocks/generateData`  |

Las cantidades se pueden pasar de dos maneras:

- `?qty=N` genera **N de cada tipo**: N usuarios, N repartidores, N pedidos y N entregas.
- Por body JSON, cada tipo por separado: `{ "users": 5, "drivers": 2, "orders": 8, "deliveries": 3 }`. Lo que venga en el body tiene prioridad sobre `qty`, y lo que no venga toma el valor de `qty`, o 0 si tampoco se mandó.

```bash
curl -X POST "http://localhost:8080/api/mocks/seed?qty=10"

curl -X POST http://localhost:8080/api/mocks/generateData \
  -H "Content-Type: application/json" \
  -d '{ "users": 5, "drivers": 2, "orders": 8, "deliveries": 3 }'
```

Respuesta (`201`):

```json
{ "status": "success", "insertados": { "usuarios": 10, "repartidores": 10, "pedidos": 10, "entregas": 10 } }
```

**Cómo se insertan:** primero los usuarios (rol `customer`) y los repartidores (rol `driver`). Después los pedidos, cada uno con uno de esos clientes recién creados. Por último las entregas: cada una va asociada a uno de esos pedidos y, cuando corresponde, a un repartidor recién creado.

**Validaciones (responden `400` con un mensaje claro):**

- Cada cantidad tiene que ser un entero entre 0 y 100 (`MAX_MOCK_ITEMS`), y al menos una tiene que ser mayor a 0.
- Para generar pedidos hace falta generar usuarios. Para generar entregas hacen falta pedidos y repartidores.

## Reglas de los datos generados

- Tienen la misma estructura que los modelos `User`, `Order` y `Delivery`.
- Los roles, estados y prioridades salen siempre de `src/constants` (`USER_ROLES`, `ORDER_STATUS`, `DELIVERY_STATUS`, `DELIVERY_PRIORITY`).
- El `total` del pedido se calcula a partir de sus items.
- El estado y la prioridad de la entrega salen de su pedido. Por ejemplo, un pedido `in_transit` tiene una entrega `in_transit`.
- Las entregas `pending` y `cancelled` no tienen repartidor. Las demás tienen uno real con rol `driver`.
- Los emails son únicos, así se pueden hacer varias cargas sin romper el índice `unique`.
- Todos los usuarios cargados tienen la contraseña `coder123`, hasheada con bcrypt (10 salt rounds).

## Otros endpoints

| Método    | Ruta                                       | Descripción                                                                 |
| --------- | ------------------------------------------ | --------------------------------------------------------------------------- |
| GET/POST  | `/api/users`, `/api/users/:id`             | Listar, ver y crear usuarios (la contraseña se hashea)                      |
| GET/POST  | `/api/orders`, `/api/orders/:id`           | Pedidos. El total se calcula desde los items y el cliente tiene que existir |
| GET/POST  | `/api/deliveries`, `/api/deliveries/:id`   | Entregas. El pedido tiene que existir y el repartidor tener rol `driver`    |

## Errores

Todos los errores pasan por un middleware central y responden con el mismo formato:

```json
{ "status": "error", "message": "\"qty\" debe ser un número entero entre 0 y 100" }
```
