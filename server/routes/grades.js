import express from 'express';
import { readDB } from '../lib/dbFile.js';

const router = express.Router();

// GET /api/grades
router.get('/', async (req, res) => {
  try {
    const grades = await readDB(async (db) => {
      // Get all unique grades
      const gradeSet = new Set();
      db.students.forEach(s => {
        if (s.grade) {
          gradeSet.add(s.grade);
        }
      });
      
      // Calculate total spending per grade
      const gradeTotals = {};
      
      gradeSet.forEach(grade => {
        gradeTotals[grade] = 0;
      });
      
      // Sum up transactions by student grade
      db.transactions.forEach(tx => {
        if (tx.studentId) {
          const student = db.students.find(s => s.id === tx.studentId);
          if (student && student.grade) {
            gradeTotals[student.grade] = (gradeTotals[student.grade] || 0) + tx.total;
          }
        }
      });
      
      // Convert to array format
      return Array.from(gradeSet).map(grade => ({
        grade,
        totalSpent: gradeTotals[grade] || 0
      })).sort((a, b) => a.grade.localeCompare(b.grade));
    });
    
    res.json(grades);
  } catch (error) {
    console.error('Error fetching grades:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/grades/:grade/students
router.get('/:grade/students', async (req, res) => {
  try {
    const students = await readDB(async (db) => {
      const grade = req.params.grade;
      
      // Get all students in this grade
      const gradeStudents = db.students.filter(s => s.grade === grade);
      
      // Calculate total spending for each student
      return gradeStudents.map(student => {
        const studentTransactions = db.transactions.filter(tx => tx.studentId === student.id);
        const totalSpent = studentTransactions.reduce((sum, tx) => sum + tx.total, 0);
        
        return {
          id: student.id,
          name: student.name,
          grade: student.grade,
          totalSpent
        };
      });
    });
    
    res.json(students);
  } catch (error) {
    console.error('Error fetching grade students:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

