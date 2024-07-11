import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'
import { prisma } from '../lib/prisma'
import { dayjs } from '../lib/dayjs'
import { ClientError } from '../errors/client-error'


export async function createActivity(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post('/trips/:trip_id/activities', {
    schema: {
      params: z.object({
        trip_id: z.string().uuid(),
      }),
      body: z.object({
        title: z.string().min(3),
        occurs_at: z.coerce.date(),
      })
    }
  }, async (request) => {
    const { trip_id } = request.params
    const { title, occurs_at } = request.body

    const trip = await prisma.trip.findUnique({
      where: { id: trip_id },
    })

    if (!trip) {
      throw new ClientError('Viagem não encontrada.')
    }

    if (dayjs(occurs_at).isBefore(trip.starts_at) || dayjs(occurs_at).isAfter(trip.ends_at)) {
      throw new ClientError('Data da atividade inválida.')
    }

    const activity = await prisma.activity.create({
      data: {
        title,
        occurs_at,
        trip_id
      }
    })

    return { activity_id: activity.id, message: 'Atividade cadastrada com sucesso!' }
  })
}

export async function getActivities(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get('/trips/:trip_id/activities', {
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
        activities: {
          orderBy: {
            occurs_at: 'asc'
          }
        }
      },
    })

    if (!trip) {
      throw new ClientError('Viagem não encontrada.')
    }

    const differenceInDaysBetweenTripStartAndEnd = dayjs(trip.ends_at).diff(trip.starts_at, 'days')

    const activities = Array.from({ length: differenceInDaysBetweenTripStartAndEnd + 1 }).map((_, index) => {
      const date = dayjs(trip.starts_at).add(index, 'days')

      return {
        date: date.toDate(),
        activities: trip.activities.filter((activity) => {
          return dayjs(activity.occurs_at).isSame(date, 'day')
        }),
      }
    })

    return { activities }
  })
}