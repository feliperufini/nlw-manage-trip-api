import fastify from 'fastify'
import cors from '@fastify/cors'
import { confirmTrip, createTrip } from './routes/trips'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'

const app = fastify()

app.register(cors, {
  origin: '*'
})

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

app.register(createTrip)
app.register(confirmTrip)

app.listen({ port: 3333 }).then(() => {
  console.log('Server Running...\nhttp://localhost:3333')
})
