import cors from '@fastify/cors'
import fastify from 'fastify'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import { createActivity, getActivities } from './routes/activities'
import { confirmParticipant } from './routes/participants'
import { confirmTrip, createTrip } from './routes/trips'
import { createLink, getLinks } from './routes/links'

const app = fastify()

app.register(cors, {
  origin: '*'
})

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

// TRIPS ROUTTES
app.register(createTrip)
app.register(confirmTrip)

// PARTICIPANTS ROUTTES
app.register(confirmParticipant)

// ACTIVITIES ROUTTES
app.register(createActivity)
app.register(getActivities)

// LINK ROUTTES
app.register(createLink)
app.register(getLinks)

app.listen({ port: 3333 }).then(() => {
  console.log('Server Running...\nhttp://localhost:3333')
})
