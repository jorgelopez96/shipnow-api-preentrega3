# ShipNow API

API de una plataforma de logística hecha con **Node.js**, **Express** (ES Modules) y **MongoDB + Mongoose**.

Esta entrega (pre-entrega del Módulo 3) suma un **manejo profesional de errores**: errores personalizados del dominio, un diccionario de errores y un middleware global que responde todos los errores con el mismo formato. Se aplica a toda la API, incluido el módulo de mocking de la entrega anterior.

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
├── app.js             Express, routers y middleware de errores (siempre al final)
├── config/            Variables de entorno validadas
├── constants/         Roles, estados, prioridades y límites
├── routes/            Solo definen rutas y delegan al controller
├── controllers/       Reciben req/res, llaman al service y responden (errores → next)
├── services/          Lógica de negocio (no conocen req ni res)
├── repositories/      Única capa que habla con Mongoose
├── models/            Schemas de User, Order y Delivery
├── mocks/             Generadores de datos falsos con @faker-js/faker (locale es)
├── errors/            Diccionario de errores y clase AppError
├── middlewares/       Middleware global de errores y de rutas inexistentes
└── utils/             Hash de contraseñas y total del pedido
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

**Validaciones:** cada cantidad tiene que ser un entero entre 0 y 100 (`MAX_MOCK_ITEMS`) y al menos una tiene que ser mayor a 0. Para generar pedidos hacen falta usuarios, y para generar entregas hacen falta pedidos y repartidores. Si la carga en MongoDB falla a mitad de camino, se borra lo que ya se había insertado en ese seed. Los códigos de cada caso están en la sección [Errores](#errores).

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
| PATCH     | `/api/orders/:id/status`                   | Cambia el estado (`{ "status": "in_transit" }`). Un pedido entregado o cancelado ya no cambia |
| GET/POST  | `/api/deliveries`, `/api/deliveries/:id`   | Entregas. El pedido tiene que existir y el repartidor tener rol `driver` y estar disponible |

## Errores

Ninguna ruta ni controller responde errores por su cuenta. Cada capa detecta el problema y lanza un `AppError` con un código del diccionario. Por ejemplo, el service lanza `new AppError('ORDER_NOT_FOUND')`, el controller lo deriva con `next(error)` y la respuesta la arma únicamente el middleware global (`src/middlewares/error.middleware.js`).

### Estructura de la respuesta

```json
{
  "status": "error",
  "statusCode": 404,
  "error": "ORDER_NOT_FOUND",
  "message": "No se encontró el pedido solicitado"
}
```

- `statusCode`: el mismo status HTTP de la respuesta.
- `error`: código estable para usar desde el frontend, los tests o la documentación.
- `message`: explicación para el cliente.
- `details`: información extra para depurar. Solo aparece si `NODE_ENV` no es `production`.

El middleware también traduce los errores que no son `AppError`: validaciones de Mongoose (`VALIDATION_ERROR`), IDs mal formados (`INVALID_ID`), JSON roto (`INVALID_JSON`), claves duplicadas (`DUPLICATE_VALUE`) y fallas de MongoDB (`DATABASE_ERROR`). Cualquier otro error inesperado responde `INTERNAL_SERVER_ERROR` sin exponer detalles internos, y los errores 500 se registran por consola.

### Diccionario de errores

Está en `src/errors/error-dictionary.js`.

| Código                      | HTTP | Cuándo                                                               |
| --------------------------- | ---- | -------------------------------------------------------------------- |
| `VALIDATION_ERROR`          | 400  | Faltan datos obligatorios o tienen un valor inválido                 |
| `INVALID_ID`                | 400  | El ID no tiene formato de ObjectId                                   |
| `INVALID_JSON`              | 400  | El body no es un JSON válido                                         |
| `ROUTE_NOT_FOUND`           | 404  | La ruta no existe                                                    |
| `DUPLICATE_VALUE`           | 409  | Se viola un índice único                                             |
| `USER_NOT_FOUND`            | 404  | El usuario (o el cliente del pedido) no existe                       |
| `USER_ALREADY_EXISTS`       | 409  | Ya hay un usuario con ese email                                      |
| `PASSWORD_REQUIRED`         | 400  | Se crea un usuario sin contraseña                                    |
| `ORDER_NOT_FOUND`           | 404  | El pedido no existe                                                  |
| `ORDER_ITEMS_REQUIRED`      | 400  | El pedido no tiene items                                             |
| `INVALID_ORDER_STATUS`      | 400  | El estado no es uno de `ORDER_STATUS`                                |
| `ORDER_ALREADY_CLOSED`      | 409  | Se intenta cambiar el estado de un pedido entregado o cancelado      |
| `DELIVERY_NOT_FOUND`        | 404  | La entrega no existe                                                 |
| `DRIVER_NOT_FOUND`          | 404  | El repartidor no existe o no tiene rol `driver`                      |
| `DRIVER_NOT_AVAILABLE`      | 409  | El repartidor tiene `isAvailable: false`                             |
| `INVALID_MOCK_AMOUNT`       | 400  | La cantidad no es un entero, es negativa o es 0                      |
| `MOCK_LIMIT_EXCEEDED`       | 400  | La cantidad supera `MAX_MOCK_ITEMS` (100)                            |
| `MOCK_DEPENDENCIES_MISSING` | 400  | Se piden pedidos sin usuarios, o entregas sin pedidos o repartidores |
| `MOCK_GENERATION_ERROR`     | 500  | Falló la carga en MongoDB. Se deshace lo insertado                   |
| `DATABASE_ERROR`            | 500  | MongoDB no responde                                                  |
| `INTERNAL_SERVER_ERROR`     | 500  | Error inesperado                                                     |

### Cómo probar los casos inválidos

Con la API corriendo en desarrollo (`npm run dev`):

```bash
# Mocks
curl "http://localhost:8080/api/mocks/users?qty=abc"        # 400 INVALID_MOCK_AMOUNT (no es un número)
curl "http://localhost:8080/api/mocks/users?qty=-5"         # 400 INVALID_MOCK_AMOUNT (negativo)
curl "http://localhost:8080/api/mocks/orders?qty=0"         # 400 INVALID_MOCK_AMOUNT (tiene que ser mayor a 0)
curl "http://localhost:8080/api/mocks/drivers?qty=500"      # 400 MOCK_LIMIT_EXCEEDED
curl -X POST http://localhost:8080/api/mocks/seed           # 400 INVALID_MOCK_AMOUNT (sin cantidades)
curl -X POST http://localhost:8080/api/mocks/seed -H "Content-Type: application/json" -d '{"users":-1}'  # 400 INVALID_MOCK_AMOUNT
curl -X POST http://localhost:8080/api/mocks/seed -H "Content-Type: application/json" -d '{"orders":3}'  # 400 MOCK_DEPENDENCIES_MISSING
curl -X POST http://localhost:8080/api/mocks/seed -H "Content-Type: application/json" -d '{users:'       # 400 INVALID_JSON

# Usuarios, pedidos y entregas
curl http://localhost:8080/api/users/abc                         # 400 INVALID_ID
curl http://localhost:8080/api/users/507f1f77bcf86cd799439011    # 404 USER_NOT_FOUND
curl -X POST http://localhost:8080/api/orders -H "Content-Type: application/json" \
  -d '{"customer":"507f1f77bcf86cd799439011","items":[{"name":"Caja","quantity":1,"price":10}],"deliveryAddress":"Calle 1"}'  # 404 USER_NOT_FOUND
curl -X PATCH http://localhost:8080/api/orders/<id>/status -H "Content-Type: application/json" -d '{"status":"on_the_way"}'  # 400 INVALID_ORDER_STATUS
curl http://localhost:8080/api/ruta-que-no-existe                # 404 ROUTE_NOT_FOUND
```

**Falla de MongoDB durante el seed:** con la API corriendo, detené MongoDB (en Windows, `net stop MongoDB` como administrador) y ejecutá `curl -X POST "http://localhost:8080/api/mocks/seed?qty=5"`. Después de unos segundos responde `500 MOCK_GENERATION_ERROR` en lugar de romperse. Si la falla ocurre a mitad de la carga, el seed borra lo que ya había insertado para no dejar datos a medias.
