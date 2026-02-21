import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    Pressable,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = 'present' | 'absent' | null;

type Student = { id: string; name: string; rollNo: string; status: Status };

type SessionRecord = {
  id: string;
  courseCode: string;
  courseName: string;
  classId: string;
  className: string;
  section: string;
  date: Date;
  durationMin: number;
  students: Student[];
};

// ─── Dummy Data ───────────────────────────────────────────────────────────────

const CLASSES = [
  { id: 'all', name: 'All Classes', sec: '' },
  { id: '1', name: 'B.Tech CSE', sec: 'A' },
  { id: '2', name: 'B.Tech CSE', sec: 'B' },
  { id: '3', name: 'B.Tech IT', sec: 'A' },
];

const daysAgo = (n: number, hour = 10, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
};

const makeStudents = (prefix: string, count: number, presentUpTo: number): Student[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i + 1}`,
    name: ['Alice Smith', 'Bob Johnson', 'Charlie Brown', 'Diana Prince', 'Evan Davis',
           'Fiona Gallagher', 'George Miller', 'Hannah White', 'Ivan Cruz', 'Julia Nair'][i % 10],
    rollNo: `${prefix}${String(i + 1).padStart(3, '0')}`,
    status: (i < presentUpTo ? 'present' : 'absent') as Status,
  }));

const SESSIONS: SessionRecord[] = [
  { id: 's1', courseCode: 'CS201', courseName: 'Data Structures',  classId: '1', className: 'B.Tech CSE', section: 'A', date: daysAgo(0, 9, 0),  durationMin: 10, students: makeStudents('CS20', 12, 10) },
  { id: 's2', courseCode: 'CS301', courseName: 'Operating Systems', classId: '2', className: 'B.Tech CSE', section: 'B', date: daysAgo(0, 11, 30), durationMin: 5,  students: makeStudents('CS30', 10, 7)  },
  { id: 's3', courseCode: 'CS401', courseName: 'Computer Networks', classId: '3', className: 'B.Tech IT',  section: 'A', date: daysAgo(1, 14, 0),  durationMin: 15, students: makeStudents('IT40', 8,  8)  },
  { id: 's4', courseCode: 'CS201', courseName: 'Data Structures',  classId: '1', className: 'B.Tech CSE', section: 'A', date: daysAgo(1, 9, 0),  durationMin: 10, students: makeStudents('CS20', 12, 9)  },
  { id: 's5', courseCode: 'CS401', courseName: 'Computer Networks', classId: '2', className: 'B.Tech CSE', section: 'B', date: daysAgo(2, 10, 0),  durationMin: 5,  students: makeStudents('CS40', 10, 8)  },
  { id: 's6', courseCode: 'CS301', courseName: 'Operating Systems', classId: '3', className: 'B.Tech IT',  section: 'A', date: daysAgo(3, 15, 30), durationMin: 15, students: makeStudents('IT30', 9,  9)  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isEditable(sessionDate: Date): boolean {
  const now = new Date();
  const midnight = new Date(sessionDate);
  midnight.setHours(24, 0, 0, 0);
  return now < midnight;
}

function formatDate(d: Date): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (sameDay(d, today)) return `Today, ${timeStr}`;
  if (sameDay(d, yesterday)) return `Yesterday, ${timeStr}`;
  return `${d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}, ${timeStr}`;
}

// ─── Student Row (same styling as session form) ───────────────────────────────

const EditStudentRow = React.memo(
  ({ student, onStatusChange }: { student: Student; onStatusChange: (id: string, status: Status) => void }) => (
    <View className="flex-row items-center justify-between py-3.5 border-b border-gray-100">
      <View className="flex-1">
        <Text className="text-base font-semibold text-gray-800">{student.name}</Text>
        <Text className="text-xs text-gray-500 font-medium mt-0.5">{student.rollNo}</Text>
      </View>

      <View className="flex-row gap-x-2">
        <Pressable
          onPress={() => onStatusChange(student.id, student.status === 'present' ? null : 'present')}
          className={`px-3 py-1.5 rounded-md border flex-row items-center gap-x-1 ${
            student.status === 'present' ? 'bg-green-100 border-green-200' : 'bg-gray-50 border-gray-200'
          }`}
        >
          {student.status === 'present' && <Ionicons name="checkmark" size={12} color="#15803d" />}
          <Text className={`text-xs font-semibold ${student.status === 'present' ? 'text-green-700' : 'text-gray-500'}`}>
            Present
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onStatusChange(student.id, student.status === 'absent' ? null : 'absent')}
          className={`px-3 py-1.5 rounded-md border flex-row items-center gap-x-1 ${
            student.status === 'absent' ? 'bg-red-100 border-red-200' : 'bg-gray-50 border-gray-200'
          }`}
        >
          {student.status === 'absent' && <Ionicons name="close" size={12} color="#b91c1c" />}
          <Text className={`text-xs font-semibold ${student.status === 'absent' ? 'text-red-700' : 'text-gray-500'}`}>
            Absent
          </Text>
        </Pressable>
      </View>
    </View>
  )
);
EditStudentRow.displayName = 'EditStudentRow';

// ─── Edit Session Modal ───────────────────────────────────────────────────────

type EditModalProps = {
  session: SessionRecord | null;
  onClose: () => void;
  onSave: (sessionId: string, updatedStudents: Student[]) => void;
};

function EditSessionModal({ session, onClose, onSave }: EditModalProps) {
  const [students, setStudents] = useState<Student[]>([]);

  // Reset students list whenever a new session is opened
  React.useEffect(() => {
    if (session) setStudents(session.students.map((s) => ({ ...s })));
  }, [session]);

  const handleStatusChange = useCallback((id: string, status: Status) => {
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  }, []);

  const presentCount = students.filter((s) => s.status === 'present').length;
  const absentCount  = students.filter((s) => s.status === 'absent').length;

  const handleSave = () => {
    if (!session) return;
    onSave(session.id, students);
    onClose();
    Alert.alert('Saved', 'Attendance records have been updated successfully.');
  };

  if (!session) return null;

  return (
    <Modal visible={!!session} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-gray-50">
        {/* Modal Header */}
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
          <TouchableOpacity onPress={onClose} className="flex-row items-center gap-x-1 p-1">
            <Ionicons name="close" size={22} color="#6b7280" />
          </TouchableOpacity>
          <View className="items-center">
            <Text className="text-base font-bold text-gray-900">Edit Attendance</Text>
            <Text className="text-xs text-gray-500">{session.courseCode} · {session.className} Sec {session.section}</Text>
          </View>
          <TouchableOpacity
            onPress={handleSave}
            className="bg-indigo-600 px-4 py-1.5 rounded-lg"
          >
            <Text className="text-white font-bold text-sm">Save</Text>
          </TouchableOpacity>
        </View>

        {/* Stats bar */}
        <View className="flex-row justify-between items-center px-4 py-3 bg-white border-b border-gray-100">
          <View className="flex-row items-center gap-x-1.5">
            <View className="w-2 h-2 rounded-full bg-green-500" />
            <Text className="text-sm text-gray-600">
              <Text className="font-bold text-gray-800">{presentCount}</Text> Present
            </Text>
          </View>
          <View className="flex-row items-center gap-x-1.5">
            <View className="w-2 h-2 rounded-full bg-red-400" />
            <Text className="text-sm text-gray-600">
              <Text className="font-bold text-gray-800">{absentCount}</Text> Absent
            </Text>
          </View>
          <Text className="text-sm text-indigo-600 font-medium">
            {students.length} Total
          </Text>
        </View>

        {/* Student list */}
        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <EditStudentRow student={item} onStatusChange={handleStatusChange} />
          )}
          ListHeaderComponent={
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-widest pt-4 pb-1">
              Students — {session.className} Sec {session.section}
            </Text>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

// ─── Session Card ─────────────────────────────────────────────────────────────

type SessionCardProps = {
  session: SessionRecord;
  onEditPress: (session: SessionRecord) => void;
  onDownloadPress: (session: SessionRecord) => void;
};

const SessionCard = React.memo(({ session, onEditPress, onDownloadPress }: SessionCardProps) => {
  const editable = isEditable(session.date);
  const presentCount = session.students.filter((s) => s.status === 'present').length;
  const absentCount  = session.students.filter((s) => s.status === 'absent').length;
  const total        = session.students.length;
  const attendancePct = total > 0 ? Math.round((presentCount / total) * 100) : 0;

  return (
    <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm">
      {/* Top row */}
      <View className="flex-row justify-between items-start">
        <View className="flex-1 pr-3">
          <Text className="text-base font-bold text-gray-900">{session.courseCode} · {session.courseName}</Text>
          <Text className="text-xs text-gray-500 mt-0.5 font-medium">
            {session.className} — Sec {session.section}
          </Text>
        </View>

        <View className="flex-row items-center gap-x-1">
          {/* Edit */}
          <TouchableOpacity
            onPress={() => onEditPress(session)}
            activeOpacity={editable ? 0.6 : 1}
            className={`p-2 rounded-lg ${editable ? 'bg-indigo-50' : 'bg-gray-100'}`}
          >
            <Ionicons
              name={editable ? 'create-outline' : 'lock-closed-outline'}
              size={18}
              color={editable ? '#4f46e5' : '#d1d5db'}
            />
          </TouchableOpacity>

          {/* Download */}
          <TouchableOpacity
            onPress={() => onDownloadPress(session)}
            activeOpacity={0.6}
            className="p-2 rounded-lg bg-emerald-50"
          >
            <Ionicons name="download-outline" size={18} color="#059669" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="h-px bg-gray-100 my-3" />

      {/* Stats */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-x-1.5">
          <View className="w-2 h-2 rounded-full bg-green-500" />
          <Text className="text-sm text-gray-600 font-medium">
            <Text className="font-bold text-gray-800">{presentCount}</Text> Present
          </Text>
        </View>
        <View className="flex-row items-center gap-x-1.5">
          <View className="w-2 h-2 rounded-full bg-red-400" />
          <Text className="text-sm text-gray-600 font-medium">
            <Text className="font-bold text-gray-800">{absentCount}</Text> Absent
          </Text>
        </View>
        <View className="flex-row items-center gap-x-1">
          <Ionicons name="time-outline" size={13} color="#9ca3af" />
          <Text className="text-xs text-gray-400 font-medium">{session.durationMin} min</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View className="mt-3">
        <View className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <View className="h-1.5 rounded-full bg-green-500" style={{ width: `${attendancePct}%` }} />
        </View>
        <Text className="text-xs text-right text-gray-400 mt-1">{attendancePct}% attendance</Text>
      </View>

      {/* Footer */}
      <View className="flex-row justify-between items-center mt-1">
        <View className="flex-row items-center gap-x-1">
          <Ionicons name="calendar-outline" size={12} color="#9ca3af" />
          <Text className="text-xs text-gray-400">{formatDate(session.date)}</Text>
        </View>
        {!editable && (
          <View className="flex-row items-center gap-x-1">
            <Ionicons name="lock-closed-outline" size={11} color="#d1d5db" />
            <Text className="text-xs text-gray-300 font-medium">Edit locked</Text>
          </View>
        )}
      </View>
    </View>
  );
});
SessionCard.displayName = 'SessionCard';

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AttendanceSessionHistory() {
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [isDropdownOpen, setDropdownOpen] = useState(false);

  // sessions state so edits reflect back on cards
  const [sessions, setSessions] = useState<SessionRecord[]>(SESSIONS);
  const [editingSession, setEditingSession] = useState<SessionRecord | null>(null);

  const selectedClass = CLASSES.find((c) => c.id === selectedClassId)!;

  const filtered = useMemo(
    () => selectedClassId === 'all' ? sessions : sessions.filter((s) => s.classId === selectedClassId),
    [selectedClassId, sessions]
  );

  const handleEditPress = useCallback((session: SessionRecord) => {
    if (!isEditable(session.date)) return;
    Alert.alert(
      'Edit Attendance',
      `Are you sure you want to edit the attendance for ${session.courseCode} – ${session.className} Sec ${session.section}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Proceed', style: 'default', onPress: () => setEditingSession(session) },
      ]
    );
  }, []);

  const handleDownloadPress = useCallback((session: SessionRecord) => {
    Alert.alert('Download Report', `Downloading attendance report for ${session.courseCode} – ${session.className} Sec ${session.section}.`);
  }, []);

  const handleSaveEdits = useCallback((sessionId: string, updatedStudents: Student[]) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, students: updatedStudents } : s))
    );
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{
          title: 'Attendance History',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#f9fafb' },
        }}
      />

      <View className="flex-1 px-4 pt-4">
        {/* Page header */}
        <View className="mb-5">
          <Text className="text-2xl font-bold text-gray-900">Session History</Text>
          <Text className="text-sm text-gray-500 mt-1">Review past attendance sessions and reports.</Text>
        </View>

        {/* Class Filter Dropdown */}
        <View className="mb-4 z-10">
          <Text className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
            Filter by Class
          </Text>
          <Pressable
            onPress={() => setDropdownOpen((o) => !o)}
            className="flex-row items-center justify-between bg-white border border-gray-200 px-4 py-3.5 rounded-xl shadow-sm"
          >
            <View className="flex-row items-center gap-x-2">
              <Ionicons name="people-outline" size={18} color="#6b7280" />
              <Text className="text-gray-800 font-semibold">
                {selectedClassId === 'all'
                  ? 'All Classes'
                  : `${selectedClass.name} (Sec ${selectedClass.sec})`}
              </Text>
            </View>
            <Ionicons name={isDropdownOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#6b7280" />
          </Pressable>

          {isDropdownOpen && (
            <View className="mt-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden absolute top-full left-0 right-0">
              {CLASSES.map((cls, index) => (
                <Pressable
                  key={cls.id}
                  onPress={() => { setSelectedClassId(cls.id); setDropdownOpen(false); }}
                  className={`px-4 py-3.5 flex-row justify-between items-center ${
                    index !== CLASSES.length - 1 ? 'border-b border-gray-100' : ''
                  } ${selectedClassId === cls.id ? 'bg-indigo-50' : 'bg-white'}`}
                >
                  <Text className={`font-medium ${selectedClassId === cls.id ? 'text-indigo-600' : 'text-gray-700'}`}>
                    {cls.id === 'all' ? 'All Classes' : `${cls.name} (Sec ${cls.sec})`}
                  </Text>
                  {selectedClassId === cls.id && (
                    <Ionicons name="checkmark-circle" size={18} color="#4f46e5" />
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Summary bar */}
        <View className="flex-row justify-between items-center mb-3 mt-1">
          <Text className="text-sm text-gray-500">
            <Text className="font-bold text-gray-800">{filtered.length}</Text> session{filtered.length !== 1 ? 's' : ''} found
          </Text>
          <View className="flex-row items-center gap-x-1">
            <View className="w-2 h-2 rounded-full bg-indigo-500" />
            <Text className="text-xs text-gray-400">Editable</Text>
            <View className="w-2 h-2 rounded-full bg-gray-200 ml-2" />
            <Text className="text-xs text-gray-400">Locked</Text>
          </View>
        </View>

        {/* Sessions list */}
        {filtered.length === 0 ? (
          <View className="flex-1 items-center justify-center pb-20">
            <Ionicons name="document-text-outline" size={52} color="#d1d5db" />
            <Text className="text-gray-400 font-semibold mt-3">No sessions found</Text>
            <Text className="text-gray-300 text-sm mt-1">Try selecting a different class.</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32 }}
            renderItem={({ item }) => (
              <SessionCard
                session={item}
                onEditPress={handleEditPress}
                onDownloadPress={handleDownloadPress}
              />
            )}
          />
        )}
      </View>

      {/* Edit Modal */}
      <EditSessionModal
        session={editingSession}
        onClose={() => setEditingSession(null)}
        onSave={handleSaveEdits}
      />
    </SafeAreaView>
  );
}
