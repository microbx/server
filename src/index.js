
import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'

import { execute, subscribe } from 'graphql'
import { createServer } from 'http'
import { SubscriptionServer } from 'subscriptions-transport-ws'

import {
    graphqlExpress,
    graphiqlExpress
} from 'apollo-server-express'

import schema from './schema'
import connectMongo from './connectors'
import { authenticate } from './auth'
import buildDataloaders from './dataloaders'
import formatError from './formatError'

const PORT = 4000

const start = async () => {

    const mongo = await connectMongo()
    const app = express()

    const buildOptions = async (req, res) => {
        const user = await authenticate(req, mongo.Users)
        return {
            context: { // NOTE: This context object is passed to all resolvers.
                dataloaders: buildDataloaders(mongo),
                mongo,
                user
            },
            formatError,
            schema
        }
    }

    app.use(cors())

    app.use('/graphql', bodyParser.json(), graphqlExpress(buildOptions))

    app.use('/graphiql', graphiqlExpress({
        endpointURL: '/graphql',
        passHeader: '\'Authorization\': \'bearer token-foo@bar.com\'',
        subscriptionsEndpoint: `ws://localhost:${PORT}/subscriptions`
    }))

    const server = createServer(app)

    server.listen(PORT, () => {
        SubscriptionServer.create(
            { execute, subscribe, schema },
            { server, path: '/subscriptions' }
        )
        console.log(`Hackernews GraphQL server running on port ${PORT}.`)
    })

}

start()
