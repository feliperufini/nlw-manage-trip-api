import cors from '@fastify/cors'
import fastify from 'fastify'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import { createActivity, getActivities } from './routes/activities'
import { confirmParticipant, createInvite, getParticipantDetails, getParticipants } from './routes/participants'
import { confirmTrip, createTrip, getTripDetails, updateTrip } from './routes/trips'
import { createLink, getLinks } from './routes/links'
import { errorHandler } from './error-handler'
import { env } from './env'

const app = fastify()

app.register(cors, {
  origin: '*'
})

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

app.setErrorHandler(errorHandler)

// TRIPS ROUTTES
app.register(createTrip)
app.register(confirmTrip)
app.register(updateTrip)
app.register(getTripDetails)

// PARTICIPANTS ROUTTES
app.register(confirmParticipant)
app.register(getParticipants)
app.register(getParticipantDetails)
app.register(createInvite)

// ACTIVITIES ROUTTES
app.register(createActivity)
app.register(getActivities)

// LINK ROUTTES
app.register(createLink)
app.register(getLinks)

app.listen({ port: env.PORT }).then(() => {
  console.log(`Server Running...\n\n${env.API_BASE_URL}`)
})
