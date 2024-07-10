import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'
import { prisma } from '../lib/prisma'

dayjs.locale('pt-br')
dayjs.extend(localizedFormat)

export async function confirmParticipant(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get('/participants/:participant_id/confirm', {
    schema: {
      params: z.object({
        participant_id: z.string().uuid(),
      })
    }
  }, async (request, response) => {
    const { participant_id } = request.params

    const participant = await prisma.participant.findUnique({
      where: {
        id: participant_id
      }
    })

    if (!participant) {
      throw new Error('Participante não encontrado.')
    }

    if (participant.is_confirmed) {
      return response.redirect(`http://localhost:3000/trips/${participant.trip_id}`)
    }

    await prisma.participant.update({
      where: { id: participant_id },
      data: { is_confirmed: true }
    })

    return response.redirect(`http://localhost:3000/trips/${participant.trip_id}`)
  })
}