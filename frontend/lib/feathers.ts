import { feathers } from '@feathersjs/feathers'
import rest from '@feathersjs/rest-client'
import authentication from '@feathersjs/authentication-client'
import axios from 'axios'
import { API_URL } from './config'

const app = feathers()

const restClient = rest(API_URL)

app.configure(restClient.axios(axios))
app.configure(authentication({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined
}))

export default app

