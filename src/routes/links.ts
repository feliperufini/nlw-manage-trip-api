import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'
import { prisma } from '../lib/prisma'
import { dayjs } from '../lib/dayjs'


export async function createLink(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post('/trips/:trip_id/links', {
    schema: {
      params: z.object({
        trip_id: z.string().uuid(),
      }),
      body: z.object({
        title: z.string().min(3),
        url: z.string().url(),
      })
    }
  }, async (request) => {
    const { trip_id } = request.params
    const { title, url } = request.body

    const trip = await prisma.trip.findUnique({
      where: { id: trip_id },
    })

    if (!trip) {
      throw new Error('Viagem não encontrada.')
    }

    const link = await prisma.link.create({
      data: {
        title,
        url,
        trip_id
      }
    })

    return { link_id: link.id, message: 'Link cadastrado com sucesso!' }
  })
}

export async function getLinks(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get('/trips/:trip_id/links', {
    schema: {
      params: z.object({
        trip_id: z.string().uuid(),
      }),
    }
  }, async (request) => {
    const { trip_id } = request.params

    const trip = await prisma.trip.findUnique({
      where: { id: trip_id },
      include: {
        links: true
      },
    })

    if (!trip) {
      throw new Error('Viagem não encontrada.')
    }

    return { links: trip.links }
  })
}