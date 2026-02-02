import { Hono } from 'hono'

const timetable = new Hono()

timetable.get('/', (c) => {
  return c.json({
    message: 'Timetable route',
  })
})

export default timetable;
