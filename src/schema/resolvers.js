
import { GraphQLScalarType } from 'graphql'
import { Kind } from 'graphql/language'
import { ObjectID } from 'mongodb'
import { URL } from 'url'

import pubsub from '../pubsub'

class ValidationError extends Error {
    constructor(message, field) {
        super(message)
        this.field = field
    }
}

function assertValidLink ({ url }) {
    try {
        new URL(url)
    } catch (error) {
        throw new ValidationError('Link validation error: invalid url.', 'url')
    }
}

function buildFilters({ OR = [], description_contains, url_contains }) {

    const filter = (description_contains || url_contains) ? {} : null

    if (description_contains) {
        filter.description = { $regex: `.*${ description_contains }.*` }
    }

    if (url_contains) {
        filter.url = { $regex: `.*${ url_contains }.*` }
    }

    let filters = filter ? [filter] : []

    for (let i = 0; i < OR.length; i++) {
        filters = filters.concat(buildFilters(OR[i]))
    }

    return filters
}

export default ({

    Date: new GraphQLScalarType({
        name: 'Date',
        description: 'Date custom scalar type',
        parseValue(value) {
            return new Date(value) // value from client
        },
        serialize(value) {
            return value.getTime() // value sent to client
        },
        parseLiteral(ast) {
            if (ast.kind === Kind.INT) {
                return parseInt(ast.value, 10) // ast value is always in string format
            }
            return null
        }
    }),

    Subscription: {
        Link: {
            subscribe: () => pubsub.asyncIterator('Link')
        }
    },

    Query: {
        allLinks: async (root, { filter, first, skip }, { mongo: { Links, Users }}) => {

            console.log('resolvers: allLinks(): called...')

            // let query = filter ? { $or: buildFilters(filter) } : {}
            //
            // const cursor = Links.find(query)
            //
            // if (first) {
            //     cursor.limit(first)
            // }
            //
            // if (skip) {
            //     cursor.skip(skip)
            // }
            //
            // return cursor.toArray()

            return Links.find({}).toArray()

        }

    },

    Mutation: {

        createLink: async (root, data, { mongo: { Links }, user }) => {

            console.log('data: ', data)

            // assertValidLink(data)

            const newLink = Object.assign({
                postedById: user && user._id,
                dateCreated: new Date()
            }, data)

            const response = await Links.insert(newLink)

            newLink.id = response.insertedIds[0]

            pubsub.publish('Link', { Link: { mutation: 'CREATED', node: newLink }})

            return newLink

        },

        createUser: async (root, data, { mongo: { Users }}) => {

            const newUser = {
                name: data.name,
                email: data.authProvider.email.email,
                password: data.authProvider.email.password
            }

            const response = await Users.insert(newUser)

            return Object.assign({ id: response.insertedIds[0] }, newUser)
        },

        createVote: async (root, data, { mongo: { Votes }, user }) => {

            const newVote = {
                userId: user && user._id,
                linkId: new ObjectID(data.linkId)
            }

            const response = await Votes.insert(newVote)

            return Object.assign({ id: response.insertedIds[0] }, newVote)
        },

        signinUser: async (root, data, { mongo: { Users }}) => {

            const user = await Users.findOne({ email: data.email.email })

            if (data.email.password === user.password) {
                return { token: `token-${ user.email }`, user }
            }

        }

    },

    Link: {

        // NOTE: Convert the "_id" field from MongoDB to "id" from the schema.
        id: root => root._id || root.id,

        postedBy: async ({ postedById }, data, { dataloaders: { userLoader }}) => {
            return await userLoader.load(postedById)
        },

        votes: async ({ _id }, data, { mongo: { Votes }}) => {
            return await Votes.find({ linkId: _id }).toArray()
        }

    },

    User: {

        // NOTE: Convert the "_id" field from MongoDB to "id" from the schema.
        id: root => root._id || root.id,

        votes: async ({ _id }, data, { mongo: { Votes }}) => {
            return await Votes.find({ userId: _id }).toArray()
        }

    },

    Vote: {

        // NOTE: Convert the "_id" field from MongoDB to "id" from the schema.
        id: root => root._id || root.id,

        user: async ({ userId }, data, { dataloaders: { userLoader }}) => {
            return await userLoader.load(userId)
        },

        link: async ({ linkId }, data, { mongo: { Links }}) => {
            return await Links.findOne({ _id: linkId })
        }

    }

})
