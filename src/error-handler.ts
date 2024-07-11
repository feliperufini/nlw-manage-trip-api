import type { FastifyInstance } from 'fastify'
import { ClientError } from './errors/client-error'
import { ZodError } from 'zod'

type FastifyErrorHandler = FastifyInstance['errorHandler']

export const errorHandler: FastifyErrorHandler = (error, request, response) => {
  if (error instanceof ZodError) {
    return response.status(400).send({
      message: 'Input inválido.',
      errors: error.flatten().fieldErrors
    })
  }
  if (error instanceof ClientError) {
    return response.status(400).send({
      message: error.message
    })
  }

  return response.status(500).send({ message: 'Internal server error' })
}