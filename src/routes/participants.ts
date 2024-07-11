import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'
import { prisma } from '../lib/prisma'
import { getMailClient } from '../lib/mail'
import nodemailer from 'nodemailer'
import { ClientError } from '../errors/client-error'
import { env } from '../env'

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
      throw new ClientError('Participante não encontrado.')
    }

    if (participant.is_confirmed) {
      return response.redirect(`${env.WEB_BASE_URL}/trips/${participant.trip_id}`)
    }

    await prisma.participant.update({
      where: { id: participant_id },
      data: { is_confirmed: true }
    })

    return response.redirect(`${env.WEB_BASE_URL}/trips/${participant.trip_id}`)
  })
}

export async function getParticipants(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get('/trips/:trip_id/participants', {
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
        participants: {
          select: {
            id: true,
            name: true,
            email: true,
            is_confirmed: true,
          }
        }
      },
    })

    if (!trip) {
      throw new ClientError('Viagem não encontrada.')
    }

    return { participants: trip.participants }
  })
}

export async function createInvite(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post('/trips/:trip_id/invites', {
    schema: {
      params: z.object({
        trip_id: z.string().uuid(),
      }),
      body: z.object({
        email: z.string().email(),
      })
    }
  }, async (request) => {
    const { trip_id } = request.params
    const { email } = request.body

    const trip = await prisma.trip.findUnique({
      where: { id: trip_id },
    })

    if (!trip) {
      throw new ClientError('Viagem não encontrada.')
    }

    const participant = await prisma.participant.create({
      data: {
        email,
        trip_id
      }
    })

    const formattedStartDate = dayjs(trip.starts_at).format('LL')
    const formattedEndDate = dayjs(trip.ends_at).format('LL')

    const mail = await getMailClient()

    const confirmationLink = `${env.API_BASE_URL}/participants/${participant.id}/confirm`

    const message = await mail.sendMail({
      from: {
        name: 'Felsky',
        address: 'felsky@mail.com',
      },
      to: participant.email,
      subject: `Confirme sua presença na viagem para ${trip.destination} em ${formattedStartDate}`,
        html: `
        <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6;">
          <p>Você foi convidado(a) para participar de uma viagem para <strong>${trip.destination}</strong> nas datas de <strong>${formattedStartDate}</strong> até <strong>${formattedEndDate}</strong>.</p>
          <p></p>
          <p>Para confirmar sua presença na viagem, clique no link abaixo:</p>
          <p></p>
          <p>
            <a href="${confirmationLink}">Confirmar viagem</a>
          </p>
          <p></p>
          <p>Caso você não saiba do que se trata esse e-mail, apenas ignore esse e-mail.</p>
        </div>
      `.trim(),
    })

    console.log(nodemailer.getTestMessageUrl(message))

    return { participant_id: participant.id, message: 'Convite enviado com sucesso!' }
  })
}

export async function getParticipantDetails(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get('/participants/:participant_id', {
    schema: {
      params: z.object({
        participant_id: z.string().uuid(),
      }),
    }
  }, async (request) => {
    const { participant_id } = request.params

    const participant = await prisma.participant.findUnique({
      select: {
        id: true,
        name: true,
        email: true,
        is_confirmed: true,
      },
      where: { id: participant_id },
    })

    if (!participant) {
      throw new ClientError('Participante não encontrado.')
    }

    return { participant }
  })
}
