
import { makeExecutableSchema } from 'graphql-tools'

import resolvers from './resolvers'

const typeDefs = `

    scalar Date

    type Link {
        id: ID!
        url: String!
        description: String!
        dateCreated: Date
        postedBy: User
        votes: [Vote!]!
    }

    type Vote {
        id: ID!
        user: User!
        link: Link!
    }

    type User {
        id: ID!
        name: String!
        email: String
        password: String
        votes: [Vote!]!
    }

    type SigninPayload {
        token: String
        user: User
    }

    type LinkSubscriptionPayload {
        mutation: _ModelMutationType!
        node: Link
    }

    input AuthProviderSignupData {
        email: AUTH_PROVIDER_EMAIL
    }

    input AUTH_PROVIDER_EMAIL {
        email: String!
        password: String!
    }

    input LinkSubscriptionFilter {
        mutation_in: [_ModelMutationType!]
    }

    input LinkFilter {
        OR: [LinkFilter!]
        description_contains: String
        url_contains: String
    }

    enum _ModelMutationType {
        CREATED
        UPDATED
        DELETED
    }

    type Query {
        allLinks(filter: LinkFilter, skip: Int, first: Int): [Link!]!
    }

    type Mutation {
        createLink(url: String!, description: String!, postedById: ID!): Link
        createVote(linkId: ID!): Vote
        createUser(name: String!, authProvider: AuthProviderSignupData!): User
        signinUser(email: AUTH_PROVIDER_EMAIL): SigninPayload!
    }

    type Subscription {
        Link(filter: LinkSubscriptionFilter): LinkSubscriptionPayload
    }

`

export default makeExecutableSchema({
    typeDefs,
    resolvers
})
