import { useState } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import type { Transaction, Student } from '../../App';

interface GradesPageProps {
  transactions: Transaction[];
  students: Student[];
  teachers?: any[];
  onCreateTeacher?: (t: any) => Promise<any>;
  onUpdateTeacher?: (id: string, t: any) => Promise<any>;
  onDeleteTeacher?: (id: string) => Promise<any>;
}

type ViewMode = 'grades' | 'students' | 'purchases';
// include teachers view
type ExtendedViewMode = ViewMode | 'teachers';

export function GradesPage({ transactions, students, teachers, onCreateTeacher, onUpdateTeacher, onDeleteTeacher }: GradesPageProps) {
  const [viewMode, setViewMode] = useState<ExtendedViewMode>('grades');
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Get unique grades
  const grades = Array.from(new Set(students.map(s => s.grade))).sort();
  const teacherCount = (teachers || []).length;

  const [selectedTeacher, setSelectedTeacher] = useState<any | null>(null);

  // Calculate spending by grade
  const getGradeSpending = (grade: string) => {
    const gradeStudents = students.filter(s => s.grade === grade);
    const gradeStudentIds = gradeStudents.map(s => s.id);
    return transactions
      .filter(tx => tx.studentId && gradeStudentIds.includes(tx.studentId))
      .reduce((sum, tx) => sum + tx.total, 0);
  };

  const getTeacherSpending = (teacherId: string) => {
    return transactions
      .filter(tx => tx.studentId === teacherId)
      .reduce((sum, tx) => sum + tx.total, 0);
  };

  // Calculate spending by student
  const getStudentSpending = (studentId: string) => {
    return transactions
      .filter(tx => tx.studentId === studentId)
      .reduce((sum, tx) => sum + tx.total, 0);
  };

  // Get student transactions
  const getStudentTransactions = (studentId: string) => {
    return transactions
      .filter(tx => tx.studentId === studentId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  const getTeacherTransactions = (teacherId: string) => {
    return transactions
      .filter(tx => tx.studentId === teacherId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  // Get students in a grade
  const getStudentsInGrade = (grade: string) => {
    return students.filter(s => s.grade === grade);
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleGradeClick = (grade: string) => {
    setSelectedGrade(grade);
    setViewMode('students');
  };

  const handleStudentClick = (student: Student) => {
    setSelectedStudent(student);
    setViewMode('purchases');
  };

  const handleBackToGrades = () => {
    setViewMode('grades');
    setSelectedGrade(null);
    setSelectedStudent(null);
  };

  const handleBackToStudents = () => {
    setViewMode('students');
    setSelectedStudent(null);
  };

  // Grades View
  if (viewMode === 'grades') {
    return (
      <div className="h-[calc(100vh-70px)] overflow-auto">
        <div className="p-6 max-w-[1400px] mx-auto">
          <Card className="p-6">
            <h2 className="text-gray-900 mb-6 text-2xl">Customers Overview</h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Teachers card */}
              <button
                key="__teachers__"
                onClick={() => setViewMode('teachers')}
                className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-md transition-all text-left"
              >
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    Teachers
                  </Badge>
                  <ChevronRight className="size-5 text-gray-400" />
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="text-gray-600 text-sm">Total</div>
                    <div className="text-gray-900 text-2xl font-semibold">{teacherCount}</div>
                  </div>
                </div>
              </button>

              {grades.map(grade => {
                const gradeSpending = getGradeSpending(grade);
                const studentCount = getStudentsInGrade(grade).length;
                return (
                  <button
                    key={grade}
                    onClick={() => handleGradeClick(grade)}
                    className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-md transition-all text-left"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="outline" className="text-lg px-3 py-1">
                        {grade}
                      </Badge>
                      <ChevronRight className="size-5 text-gray-400" />
                    </div>
                    <div className="space-y-2">
                      <div>
                        <div className="text-gray-600 text-sm">Total Spending</div>
                        <div className="text-gray-900 text-2xl font-semibold">
                          ₩{gradeSpending.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600 text-sm">Students</div>
                        <div className="text-gray-900 text-lg">{studentCount}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {grades.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No customers found
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // Students in Grade View
  if (viewMode === 'students' && selectedGrade) {
    const gradeStudents = getStudentsInGrade(selectedGrade);
    
    return (
      <div className="h-[calc(100vh-70px)] overflow-auto">
        <div className="p-6 max-w-[1400px] mx-auto">
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToGrades}
              >
                <ArrowLeft className="size-4 mr-2" />
                Back to Grades
              </Button>
              <div>
                <h2 className="text-gray-900 text-2xl">{selectedGrade}</h2>
                <p className="text-gray-600 text-sm">
                  {gradeStudents.length} students
                </p>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-4 text-gray-600">Student Name</th>
                    <th className="text-left p-4 text-gray-600">Grade</th>
                    <th className="text-right p-4 text-gray-600">Total Spending</th>
                    <th className="text-center p-4 text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {gradeStudents.map(student => {
                    const spending = getStudentSpending(student.id);
                    return (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="p-4">
                          <div className="text-gray-900">{student.name}</div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline">{student.grade}</Badge>
                        </td>
                        <td className="p-4 text-right">
                          <div className="text-gray-900 font-semibold">
                            ₩{spending.toFixed(2)}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStudentClick(student)}
                          >
                            View Purchases
                            <ChevronRight className="size-4 ml-2" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {gradeStudents.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No students in this grade
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Teachers View (show teachers like customers/students)
  if (viewMode === 'teachers') {
    const tList = teachers || [];
    const handleAddTeacher = async () => {
      const name = prompt('Teacher name');
      if (!name) return;
      const subject = prompt('Subject (optional)') || '';
      const email = prompt('Email (optional)') || '';
      try {
        await onCreateTeacher?.({ name, subject, email });
      } catch (e) {
        console.error(e);
        alert('Failed to create teacher');
      }
    };

    const handleEdit = async (t: any) => {
      const name = prompt('Teacher name', t.name) || t.name;
      const subject = prompt('Subject', t.subject) || t.subject || '';
      const email = prompt('Email', t.email) || t.email || '';
      try {
        await onUpdateTeacher?.(t.id, { name, subject, email });
      } catch (e) {
        console.error(e);
        alert('Failed to update teacher');
      }
    };

    const handleDelete = async (id: string) => {
      if (!confirm('Delete this teacher?')) return;
      try {
        await onDeleteTeacher?.(id);
      } catch (e) {
        console.error(e);
        alert('Failed to delete teacher');
      }
    };

    return (
      <div className="h-[calc(100vh-70px)] overflow-auto">
        <div className="p-6 max-w-[1400px] mx-auto">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-gray-900 text-2xl">Teachers</h2>
                <p className="text-gray-600 text-sm">{tList.length} teachers</p>
              </div>
              <div>
                <Button onClick={handleAddTeacher}>Add Teacher</Button>
                <Button variant="outline" size="sm" onClick={() => setViewMode('grades')} className="ml-2">Back</Button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-4 text-gray-600">Name</th>
                    <th className="text-left p-4 text-gray-600">Subject</th>
                    <th className="text-right p-4 text-gray-600">Total Spending</th>
                    <th className="text-center p-4 text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tList.map(t => {
                    const spending = getTeacherSpending(t.id);
                    return (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="p-4">{t.name}</td>
                        <td className="p-4">
                          <Badge variant="outline">{t.subject || '—'}</Badge>
                        </td>
                        <td className="p-4 text-right">
                          <div className="text-gray-900 font-semibold">₩{spending.toFixed(2)}</div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setSelectedTeacher(t); setViewMode('purchases'); }}
                            >
                              View Purchases
                              <ChevronRight className="size-4 ml-2" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEdit(t)}>Edit</Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(t.id)}>Delete</Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Purchases View (student or teacher)
  if (viewMode === 'purchases' && (selectedStudent || selectedTeacher)) {
    const studentTransactions = selectedStudent ? getStudentTransactions(selectedStudent.id) : [];
    const teacherTransactions = selectedTeacher ? getTeacherTransactions(selectedTeacher.id) : [];
    const combinedTransactions = selectedStudent ? studentTransactions : teacherTransactions;
    const totalSpending = selectedStudent ? getStudentSpending(selectedStudent.id) : (selectedTeacher ? getTeacherSpending(selectedTeacher.id) : 0);

    return (
      <div className="h-[calc(100vh-70px)] overflow-auto">
        <div className="p-6 max-w-[1400px] mx-auto">
          <Card className="p-6">
                <div className="flex items-center gap-4 mb-6">
              <Button
                variant="outline"
                size="sm"
                onClick={selectedStudent ? handleBackToStudents : () => { setViewMode('teachers'); setSelectedTeacher(null); }}
              >
                <ArrowLeft className="size-4 mr-2" />
                Back
              </Button>
              <div>
                <h2 className="text-gray-900 text-2xl">{selectedStudent ? selectedStudent.name : selectedTeacher?.name}</h2>
                <p className="text-gray-600 text-sm">
                  {selectedStudent ? selectedStudent.grade : (selectedTeacher?.subject || '—')} • Total Spending: ₩{totalSpending.toFixed(2)}
                </p>
              </div>
            </div>

            {combinedTransactions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No purchases found
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-4 text-gray-600">Date & Time</th>
                      <th className="text-left p-4 text-gray-600">Items</th>
                      <th className="text-right p-4 text-gray-600">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {combinedTransactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="p-4">
                          <div className="text-gray-900">{formatDateTime(tx.timestamp)}</div>
                          <div className="text-gray-500 text-sm">Transaction ID: {tx.id}</div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            {tx.items.map(item => (
                              <div key={item.product.id} className="text-sm">
                                <span className="text-gray-900">
                                  {item.product.name}
                                </span>
                                <span className="text-gray-500 ml-2">
                                  × {item.quantity} @ ₩{item.product.price.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="text-gray-900 font-semibold">
                            ₩{tx.total.toFixed(2)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  return null;
}

