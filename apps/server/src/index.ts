import { handle } from 'hono/vercel'
import app from './v1'

export default handle(app)
