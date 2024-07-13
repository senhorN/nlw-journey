import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import {z} from 'zod';
import { prisma } from "../lib/prisma";
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import { error } from "console";
import { start } from "repl";
import { getMailClient } from "../lib/mail";
import nodemailer from 'nodemailer' 
import mail from "nodemailer/lib/mailer";
import localizedFormat from 'dayjs/plugin/localizedFormat'


export async function createTrip(app: FastifyInstance){
    app.withTypeProvider<ZodTypeProvider>().post('/trips', {
    schema: {
        body: z.object({
            destino: z.string().min(4),
            starts_at: z.coerce.date(),
            ends_at:  z.coerce.date(),
            owner_name: z.string(),
            owner_email: z.string().email(),
            emails_to_invite: z.array(z.string().email())
        })   
    },
    },async (request) => {
        
        const {destino, starts_at, ends_at, owner_name, owner_email, emails_to_invite } = request.body
        
        if (dayjs(starts_at).isBefore(new Date())){
            
            throw new Error('Data do começo é invalida!'); 
        }

        if (dayjs(ends_at).isBefore(starts_at)){
            
            throw new Error('Data do Final é invalida!'); 
        }

        await prisma.$transaction
        
        
        const trip = await prisma.trip.create({
            data: {
                destino,
                starts_at,
                ends_at,
                Participant: {
                    createMany: {
                        data: [
                            {
                                name: owner_email,
                                email: owner_email,
                                is_owner: true,
                                is_confirmed: true,
                            },
                            ...emails_to_invite.map(email => {
                                return {email}
                            })  
                        ], 
                    }
                }
            }
        })

    
        await prisma.participant.create({
            data: {
                name: owner_name,
                email: owner_email,
                tripId: trip.id,
            }
        })

        dayjs.locale('pt-br')
        dayjs.extend(localizedFormat)
        const formattedStartDate = dayjs(starts_at).format('LL')
        const formattedEndDate = dayjs(ends_at).format('LL')
        const mail = await getMailClient()
        
        const confirmationLink = `htpp://localhost:3333/trips/${trip.id}/confirm` 


        const message = await mail.sendMail({
            from: {
                name: 'Equipe Uniception',
                address: 'Uniceptioncorp@uniception.com.br'
            },
            to: {
                name: owner_name,
                address: owner_email
            },
            subject: `Confirme sua viagem para ${destino} em ${formattedStartDate}`,
            html: `
                    <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6;">
                        <p>Você selecionou a criação de uma viagem apra <strong>${destino}</strong> nas datas de <strong> ${formattedStartDate}</strong> até <strong>
                        ${formattedEndDate}</stron></p>
                        <p>Para confirmar sua viagem, clique no link abaixo: </p>
                        <p></p> <!--QUEBRA DE LINHA-->
                        <p>
                            <a href="${confirmationLink}" >Confirmar viagem</a>
                        </p>
                        <p></p> <!--QUEBRA DE LINHA-->
                        <p>Caso você não saiba do que se trata esse e-mail, apenas ignore.</p>

                    </div> 
                `.trim() 
        }) 
        
        console.log(nodemailer.getTestMessageUrl(message))
        return { tripId: trip.id }
    })
}
