import { Hono } from 'hono'
import users from '../routes/users';
import attendance from '../routes/attendance';
import history from '../routes/history';
import notifications from '../routes/notifications';
import timetable from '../routes/timetable';
import courses from '../routes/courses';

const app = new Hono().basePath('/v1')

app.route('/users', users)
app.route('/attendance', attendance)
app.route('/history', history)
app.route('/notifications', notifications)
app.route('/timetable', timetable)
app.route('/courses', courses)

export default app;
