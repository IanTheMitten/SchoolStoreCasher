import { useState, useMemo } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import type { Student } from '../App';

interface StudentSelectorProps {
  students: Student[];
  selectedStudent: Student | null;
  onSelect: (student: Student | null) => void;
}

export function StudentSelector({ students, selectedStudent, onSelect }: StudentSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterGender, setFilterGender] = useState<string>('all');

  const grades = useMemo(() => {
    return Array.from(new Set(students.map(s => s.grade))).sort();
  }, [students]);

  const genders = ['Male', 'Female'];

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = searchQuery === '' ||
        student.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGrade = filterGrade === 'all' || student.grade === filterGrade;
      const matchesGender = filterGender === 'all' || student.gender === filterGender;
      return matchesSearch && matchesGrade && matchesGender;
    });
  }, [students, searchQuery, filterGrade, filterGender]);

  const handleSelectStudent = (student: Student) => {
    onSelect(student);
    setSearchQuery('');
    setShowResults(false);
    setFilterGrade('all');
    setFilterGender('all');
  };

  const handleClearSelection = () => {
    onSelect(null);
    setSearchQuery('');
    setFilterGrade('all');
    setFilterGender('all');
  };

  if (selectedStudent) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-gray-900">{selectedStudent.name}</div>
          <div className="text-gray-600 text-sm">{selectedStudent.grade}</div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearSelection}
          aria-label="Clear student selection"
        >
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Quick Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
        <Input
          id="student-search"
          type="text"
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          className="pl-10"
        />
      </div>

      {/* Filter Options */}
      <div className="flex gap-2">
        <Select value={filterGrade} onValueChange={setFilterGrade}>
          <SelectTrigger className="flex-1">
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
          <SelectTrigger className="flex-1">
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

      {/* Results */}
      {(showResults || filterGrade !== 'all' || filterGender !== 'all') && (
        <div className="border border-gray-200 rounded-lg max-h-[240px] overflow-auto">
          {filteredStudents.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No students found
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredStudents.map(student => (
                <button
                  key={student.id}
                  onClick={() => handleSelectStudent(student)}
                  className="w-full p-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="text-gray-900">{student.name}</div>
                  <div className="text-gray-600 text-sm">
                    {student.grade} • {student.gender}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
