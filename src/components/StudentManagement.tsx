import { useState } from 'react';
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { studentsAPI } from '../services/api';
import type { Student } from '../App';

interface StudentManagementProps {
  students: Student[];
  onUpdateStudents: (students: Student[]) => Promise<void>;
}

const grades = ['Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', '국내반'];
const genders = ['Male', 'Female'];

export function StudentManagement({ students, onUpdateStudents }: StudentManagementProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    grade: 'Grade 9',
    gender: 'Male',
    barcode: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterGender, setFilterGender] = useState('all');

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = filterGrade === 'all' || student.grade === filterGrade;
    const matchesGender = filterGender === 'all' || student.gender === filterGender;
    return matchesSearch && matchesGrade && matchesGender;
  });

  const handleOpenDialog = (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        name: student.name,
        grade: student.grade,
        gender: student.gender || 'Male',
        barcode: student.barcode || '',
      });
    } else {
      setEditingStudent(null);
      setFormData({
        name: '',
        grade: 'Grade 9',
        gender: 'Male',
        barcode: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingStudent(null);
  };

  const handleSaveStudent = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter student name');
      return;
    }

    try {
      if (editingStudent) {
        // Update existing student
        const updated = await studentsAPI.update(editingStudent.id, {
          name: formData.name,
          grade: formData.grade,
          gender: formData.gender,
          barcode: formData.barcode.trim() || undefined,
        });
        
        const updatedStudents = students.map(s =>
          s.id === editingStudent.id
            ? { ...s, ...updated }
            : s
        );
        await onUpdateStudents(updatedStudents);
        toast.success('Student updated successfully');
      } else {
        // Add new student
        const newStudent = await studentsAPI.create({
          name: formData.name,
          grade: formData.grade,
          gender: formData.gender,
          barcode: formData.barcode.trim() || undefined,
        });
        
        await onUpdateStudents([...students, newStudent as Student]);
        toast.success('Student added successfully');
      }

      handleCloseDialog();
    } catch (error: any) {
      console.error('Error saving student:', error);
      toast.error(error.message || 'Failed to save student');
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('Are you sure you want to delete this student?')) {
      return;
    }

    try {
      await studentsAPI.delete(studentId);
      await onUpdateStudents(students.filter(s => s.id !== studentId));
      toast.success('Student deleted successfully');
    } catch (error: any) {
      console.error('Error deleting student:', error);
      toast.error(error.message || 'Failed to delete student');
    }
  };

  const getGradeCounts = () => {
    const counts: Record<string, number> = {};
    students.forEach(student => {
      counts[student.grade] = (counts[student.grade] || 0) + 1;
    });
    return counts;
  };

  const gradeCounts = getGradeCounts();

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-gray-900 mb-1">Student Management</h2>
            <p className="text-gray-600">Manage student records ({students.length} total)</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="size-4 mr-2" />
            Add Student
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {grades.map(grade => (
            <div key={grade} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-gray-600 text-sm">{grade}</div>
              <div className="text-gray-900 mt-1">{gradeCounts[grade] || 0} students</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Input
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select value={filterGrade} onValueChange={setFilterGrade}>
            <SelectTrigger>
              <SelectValue placeholder="Grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {grades.map(grade => (
                <SelectItem key={grade} value={grade}>{grade}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterGender} onValueChange={setFilterGender}>
            <SelectTrigger>
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {genders.map(gender => (
                <SelectItem key={gender} value={gender}>{gender}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Students Table */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 text-gray-600">Name</th>
                <th className="text-left p-3 text-gray-600">Grade</th>
                <th className="text-left p-3 text-gray-600">Gender</th>
                <th className="text-left p-3 text-gray-600">Barcode</th>
                <th className="text-right p-3 text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStudents.map(student => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="p-3">
                    <div className="text-gray-900">{student.name}</div>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline">{student.grade}</Badge>
                  </td>
                  <td className="p-3 text-gray-600">{student.gender || '—'}</td>
                  <td className="p-3 text-gray-600 font-mono text-xs">{student.barcode || '—'}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDialog(student)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteStudent(student.id)}
                      >
                        <Trash2 className="size-4 text-red-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredStudents.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No students found
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStudent ? 'Edit Student' : 'Add New Student'}</DialogTitle>
            <DialogDescription>
              {editingStudent ? 'Update student information' : 'Enter student details'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="student-name">Full Name</Label>
              <Input
                id="student-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., John Smith"
              />
            </div>

            <div>
              <Label htmlFor="student-barcode">Barcode</Label>
              <Input
                id="student-barcode"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="Scan or enter student barcode"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="student-grade">Grade</Label>
                <Select
                  value={formData.grade}
                  onValueChange={(value) => setFormData({ ...formData, grade: value })}
                >
                  <SelectTrigger id="student-grade">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {grades.map(grade => (
                      <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="student-gender">Gender</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData({ ...formData, gender: value })}
                >
                  <SelectTrigger id="student-gender">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {genders.map(gender => (
                      <SelectItem key={gender} value={gender}>{gender}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              <X className="size-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSaveStudent}>
              <Save className="size-4 mr-2" />
              {editingStudent ? 'Update' : 'Add'} Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
