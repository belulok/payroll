import { feathers } from '@feathersjs/feathers'
import rest from '@feathersjs/rest-client'
import authentication from '@feathersjs/authentication-client'
import axios from 'axios'

const app = feathers()

const restClient = rest(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3030')

app.configure(restClient.axios(axios))
app.configure(authentication({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined
}))

export default app

