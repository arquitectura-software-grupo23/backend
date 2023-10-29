# Stocknet backend

## Servicios

### 1. API (Directorio: `/api`)

#### Endpoints

- `/` (GET) - Endpoint básico que muestra el estado del servicio.
- `/stocks` (GET) - Obtiene los datos más recientes de las acciones.
- `/stocks/:symbol` (GET) - Obtiene datos de una acción basándose en el símbolo proporcionado y parámetros de consulta opcionales.
- `/candlestick/:symbol` (GET) - Obtiene datos de velas para un símbolo de acción dado y parámetros de consulta opcionales.
- `/requests` (GET) - Obtiene todas las solicitudes de usuarios.
- `/requestsWithValidations` (GET) - Obtiene las solicitudes de los usuarios junto con sus validaciones.
- `/request` (POST) - Crea una nueva solicitud de usuario.
- `/validations` (GET) - Obtiene todas las validaciones.
- `/validation` (POST) - Agrega una nueva validación.
- `/validate` (POST) - Valida una transacción de Webpay basándose en el token proporcionado y actualiza el estado de la solicitud correspondiente.
- `/stock` (POST) - Añade datos de una acción.
- `/logUser` (POST) - Registra un usuario en el sistema guardando una entrada en la base de datos.
- `/users` (GET) - Obtiene todos los usuarios.
- `/requestProjection/:symbol` (POST) - Solicita una proyección de regresión para un símbolo de acción en una fecha futura.
- `/updateRegressionEntry/:jobId` (PUT) - Actualiza una entrada de regresión con proyecciones.
- `/getRegressionResult/:jobId` (GET) - Obtiene el resultado de una regresión basándose en el jobId.
- `/regressioncandle/:jobId` (GET) - Obtiene datos de velas basados en los resultados de regresión.
- `/getAllRegressions/:userId` (GET) - Obtiene todos los jobIds de regresión para un usuario.


### 2. MQTT (Directorio: `/mqtt`)

#### Características

- Se conecta al broker MQTT.
- Se suscribe a temas:
  - `stocks/info`
  - `stocks/validation`
- Al recibir mensajes:
  - Para `stocks/info`, reenvía el mensaje a la API.
  - Para `stocks/validation`, envía una solicitud post de validación si el `group_id` coincide.

#### Puntos de Acceso

- `/` (GET) - Punto de acceso básico que muestra el estado del servicio.
- `/request` (POST) - Reenvía una solicitud como un mensaje MQTT publicado.

### 3. Workers (Directorio `/workers-service`)
Usa `bullmq` y `redis` para lograr una implementación de workers. Estos workers son los encargados de calcular las regresiones lineales que los usuarios piden desde el frontend. Esto funciona a traves de un jobmaster (`/workers-service/producers`) que se comunica con el servicio **API** para agregar tareas a una cola. Estas tareas son tomadas por workers (`/workers-service/consumers`) que tienen la responsabilidad de calcular estas regresiones.

### Flujo normal
1. Al recibir una request desde el frontend la **API** se comunica con el `producer` para generar la tarea y agregarla a la cola.
2. En ese momento, el producer asigna un id a la regresion y lo devuelve a la **API**, y comanda a uno de los workers a la tarea.
3. Los workers empiezan a calcular la regresion apenas reciben la orden
4. Al terminar actualizan los valores de la regresion comunicandose directamente a la **API**.

Este comportamiento permite a los usuarios ver las regresiones apenas las piden, pero solo tendran el resultado una vez que los workers hayan actualizado la entrada correctamente.

### Endpoint producer:
-  `/job` (POST) Endpoint que recibe ordenes para regresion lineal.

### 4. NGINX (Directorio: `/nginx`)

Este servicio actúa como un proxy inverso, direccionando las solicitudes entrantes desde el puerto de navegacion al puerto correspondiente al servicio API.

## Configuración y Uso

1. Clona el repositorio.
2. Navega hasta la raíz del proyecto.
3. En el directorio `mqtt/`: Rellenar un archivo `.env` siguiendo la guia del `.env.template` segun sea apropiado.
4. Utiliza `docker-compose.yml` o `docker-compose-dev.yml` para correr el backend.

Ejemplo:

```bash
docker-compose up --build ```
