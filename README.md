# 🌊 Sabor a Mar — Chatbot IA para WhatsApp

Chatbot conversacional con inteligencia artificial para el restaurante de mariscos **Sabor a Mar**, integrado con la API de WhatsApp Business y potenciado por OpenAI GPT-4o-mini.

## Descripción

Sofi es la asistente virtual de Sabor a Mar. Atiende clientes por WhatsApp de forma natural y cálida, permitiendo:

- **Consultar el menú completo** con precios en COP
- **Recibir recomendaciones inteligentes** según antojo o presupuesto
- **Reservar mesa** con confirmación conversacional (personas, fecha, hora)
- **Modificar reservas** existentes con lenguaje natural
- **Chat libre** con respuestas generadas por IA

## Tecnologías

| Componente | Tecnología |
|---|---|
| Runtime | Node.js (ES Modules) |
| Framework | Express.js |
| IA / LLM | OpenAI GPT-4o-mini |
| Mensajería | Meta WhatsApp Business API v21.0 |
| HTTP Client | Axios |
| Entorno | dotenv |

## Estructura del Proyecto

```
src/
├── server.js              # Servidor Express + lógica de conversación
├── channels/
│   └── whatsapp.js        # Integración WhatsApp Business API
├── llm/
│   ├── index.js           # Motor LLM con OpenAI + fallback local
│   └── prompts.js         # Prompts y menú destacado
├── storage/
│   └── memory.js          # Estado de sesión en memoria
├── utils/
│   └── text.js            # NLP en español (fechas, horas, intenciones)
└── data/
    └── welcome.txt        # Mensaje de bienvenida
```

## Características Destacadas

- **Procesamiento de Lenguaje Natural en español**: Interpreta fechas ("13 de septiembre", "mañana"), horas ("7:30 pm"), cantidades ("para cuatro") y expresiones coloquiales
- **Flujo de reservas inteligente**: Dos modalidades (solo mesa / mesa + platos), confirmación, modificación y gestión de capacidad
- **Fallback local**: Si la API de OpenAI no está disponible, responde con lógica local
- **Botones interactivos**: Menú de opciones con botones de WhatsApp
- **Historial conversacional**: Mantiene contexto de las últimas 20 interacciones

## Instalación

```bash
git clone https://github.com/lianparra17/Saboramar.git
cd Saboramar

npm install

cp .env.example .env
# Editar .env con tus credenciales

npm run dev    # Desarrollo (watch mode)
npm start      # Producción
```

## Variables de Entorno

Ver `.env.example` para la lista completa de variables requeridas.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/webhook` | Verificación de webhook de WhatsApp |
| POST | `/webhook` | Recepción y procesamiento de mensajes |
| GET | `/` | Health check |

## Autor

**Lian Parra** — [GitHub](https://github.com/lianparra17)

---

*Proyecto desarrollado como solución de comercio conversacional para restaurantes.*
