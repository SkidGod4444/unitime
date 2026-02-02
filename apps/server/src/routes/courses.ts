import { Hono } from 'hono'

const courses = new Hono()

courses.get('/', (c) => {
  return c.json({
    message: 'Courses route',
  })
})

export default courses;
