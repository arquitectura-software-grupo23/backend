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
- `/stock` (POST) - Añade datos de una acción.
- `/logUser` (POST) - Registra un usuario en el sistema.
- `/addMoney` (POST) - Aumenta el saldo de la cartera de un usuario.
- `/getMoney/:id` (GET) - Obtiene la cantidad de dinero que tiene un usuario.
- `/users` (GET) - Obtiene todos los usuarios.

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

### 3. NGINX (Directorio: `/nginx`)

Este servicio actúa como un proxy inverso, direccionando las solicitudes entrantes desde el puerto de navegacion al puerto correspondiente al servicio API.

## Configuración y Uso

1. Clona el repositorio.
2. Navega hasta la raíz del proyecto.
3. En el directorio `mqtt/`: Rellenar un archivo `.env` siguiendo la guia del `.env.template` segun sea apropiado.
4. Utiliza `docker-compose.yml` o `docker-compose-dev.yml` para correr el backend.

Ejemplo:

```bash
docker-compose up --build```
