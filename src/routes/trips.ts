import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'
import { prisma } from '../lib/prisma'
import nodemailer from 'nodemailer'
import { getMailClient } from '../lib/mail'
import { dayjs } from '../lib/dayjs'
import { ClientError } from '../errors/client-error'
import { env } from '../env'

export async function createTrip(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post('/trips', {
    schema: {
      body: z.object({
        destination: z.string().min(3).max(90),
        starts_at: z.coerce.date(),
        ends_at: z.coerce.date(),
        owner_name: z.string(),
        owner_email: z.string().email(),
        emails_to_invite: z.array(z.string().email()),
      })
    }
  }, async (request) => {
    const { destination, starts_at, ends_at, owner_name, owner_email, emails_to_invite } = request.body

    if (dayjs(starts_at).isBefore(new Date())) {
      throw new ClientError('Data de início da viagem inválida.')
    }

    if (dayjs(ends_at).isBefore(starts_at)) {
      throw new ClientError('Data de fim da viagem inválida.')
    }

    const trip = await prisma.trip.create({
      data: {
        destination,
        starts_at: starts_at,
        ends_at: ends_at,
        participants: {
          createMany: {
            data: [
              {
                name: owner_name,
                email: owner_email,
                is_owner: true,
                is_confirmed: true,
              },
              ...emails_to_invite.map((email) => {
                return { email }
              })
            ]
          }
        }
      }
    })

    const formattedStartDate = dayjs(starts_at).format('LL')
    const formattedEndDate = dayjs(ends_at).format('LL')

    const confirmationLink = `${env.API_BASE_URL}/trips/${trip.id}/confirm`

    const mail = await getMailClient()

    const message = await mail.sendMail({
      from: {
        name: 'Felsky',
        address: 'felsky@mail.com',
      },
      to: {
        name: owner_name,
        address: owner_email,
      },
      subject: `Confirme sua viagem para ${destination} em ${formattedStartDate}`,
      html: `
        <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6;">
          <p>Você solicitou a criação de uma viagem para <strong>${destination}</strong> nas datas de <strong>${formattedStartDate}</strong> até <strong>${formattedEndDate}</strong>.</p>
          <p></p>
          <p>Para confirmar sua viagem, clique no link abaixo:</p>
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

    return { trip_id: trip.id, message: 'Viagem cadastrada com sucesso!' }
  })
}

export async function confirmTrip(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get('/trips/:trip_id/confirm', {
    schema: {
      params: z.object({
        trip_id: z.string().uuid(),
      })
    }
  }, async (request, response) => {
    const { trip_id } = request.params

    const trip = await prisma.trip.findUnique({
      where: { id: trip_id },
      include: {
        participants: {
          where: { is_owner: false },
        }
      },
    })

    if (!trip) {
      throw new ClientError('Viagem não encontrada.')
    }

    if (trip.is_confirmed) {
      return response.redirect(`${env.WEB_BASE_URL}/trips/${trip_id}`)
    }

    await prisma.trip.update({
      where: { id: trip_id },
      data: { is_confirmed: true },
    })

    const formattedStartDate = dayjs(trip.starts_at).format('LL')
    const formattedEndDate = dayjs(trip.ends_at).format('LL')

    const mail = await getMailClient()

    await Promise.all(
      trip.participants.map(async (participant) => {
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
      })
    )

    return response.redirect(`${env.WEB_BASE_URL}/trips/${trip_id}`)
  })
}

export async function updateTrip(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().put('/trips/:trip_id', {
    schema: {
      params: z.object({
        trip_id: z.string().uuid(),
      }),
      body: z.object({
        destination: z.string().min(3).max(90),
        starts_at: z.coerce.date(),
        ends_at: z.coerce.date(),
      })
    }
  }, async (request) => {
    const { trip_id } = request.params
    const { destination, starts_at, ends_at } = request.body

    const trip = await prisma.trip.findUnique({
      where: { id: trip_id },
    })

    if (!trip) {
      throw new ClientError('Viagem não encontrada.')
    }

    if (dayjs(starts_at).isBefore(new Date())) {
      throw new ClientError('Data de início da viagem inválida.')
    }

    if (dayjs(ends_at).isBefore(starts_at)) {
      throw new ClientError('Data de fim da viagem inválida.')
    }

    await prisma.trip.update({
      where: { id: trip_id },
      data: { destination, starts_at, ends_at },
    })

    return { message: 'Viagem atualizada com sucesso!' }
  })
}

export async function getTripDetails(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get('/trips/:trip_id', {
    schema: {
      params: z.object({
        trip_id: z.string().uuid(),
      }),
    }
  }, async (request) => {
    const { trip_id } = request.params

    const trip = await prisma.trip.findUnique({
      select: {
        id: true,
        destination: true,
        starts_at: true,
        ends_at: true,
        is_confirmed: true,
      },
      where: { id: trip_id },
    })

    if (!trip) {
      throw new ClientError('Viagem não encontrada.')
    }

    return { trip }
  })
}
