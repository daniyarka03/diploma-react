// types.ts
export interface Goal {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  coinsReward: number;
  completed: boolean;
  createdAt: string;
}

export interface User {
  level: number;
  xp: number;
  coins: number;
  xpToNextLevel: number;
}

// App.tsx
import { useState, useEffect } from 'react';
import { Plus, Coins, Trophy, Star, Target, CheckCircle, Edit2, Trash2 } from 'lucide-react';
import "./css/NewPage.css";

const INITIAL_USER: User = {
    level: 1,
    xp: 0,
    coins: 0,
    xpToNextLevel: 100
  };
const calculateXpToNextLevel = (level: number): number => {
  return Math.floor(100 * Math.pow(1.2, level - 1));
};

const NewPage = () => {
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingGoal, setDeletingGoal] = useState<Goal | null>(null);
  
    const [goals, setGoals] = useState<Goal[]>(() => {
        const saved = localStorage.getItem('goals');
        return saved ? JSON.parse(saved) : [];
      });
const [user, setUser] = useState<User>(() => {
  const saved = localStorage.getItem('user');
  return saved ? JSON.parse(saved) : INITIAL_USER;
});

const [newGoal, setNewGoal] = useState({
  title: '',
  description: '',
  xpReward: 0,
  coinsReward: 0
});

const [isModalOpen, setIsModalOpen] = useState(false);

useEffect(() => {
  localStorage.setItem('goals', JSON.stringify(goals));
  localStorage.setItem('user', JSON.stringify(user));
}, [goals, user]);

const addGoal = () => {
  if (!newGoal.title) return;

  const goal: Goal = {
    id: Date.now().toString(),
    title: newGoal.title,
    description: newGoal.description,
    xpReward: Number(newGoal.xpReward),
    coinsReward: Number(newGoal.coinsReward),
    completed: false,
    createdAt: new Date().toISOString()
  };

  setGoals([...goals, goal]);
  setNewGoal({ title: '', description: '', xpReward: 0, coinsReward: 0 });
  setIsModalOpen(false);
};

const completeGoal = (goalId: string) => {
  const goal = goals.find(g => g.id === goalId);
  if (!goal || goal.completed) return;

  let newXp = user.xp + goal.xpReward;
  let newLevel = user.level;
  let newXpToNextLevel = user.xpToNextLevel;

  while (newXp >= newXpToNextLevel) {
    newXp -= newXpToNextLevel;
    newLevel++;
    newXpToNextLevel = calculateXpToNextLevel(newLevel);
  }

  setUser({
    level: newLevel,
    xp: newXp,
    coins: user.coins + goal.coinsReward,
    xpToNextLevel: newXpToNextLevel
  });

  setGoals(goals.map(g => 
    g.id === goalId ? { ...g, completed: true } : g
  ));
};
const resetForm = () => {
    setNewGoal({ title: '', description: '', xpReward: 0, coinsReward: 0 });
    setIsEditMode(false);
    setEditingGoal(null);
    setIsModalOpen(false);
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setNewGoal({
      title: goal.title,
      description: goal.description,
      xpReward: goal.xpReward,
      coinsReward: goal.coinsReward
    });
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = (goal: Goal) => {
    setDeletingGoal(goal);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (deletingGoal) {
      setGoals(goals.filter(g => g.id !== deletingGoal.id));
      setIsDeleteModalOpen(false);
      setDeletingGoal(null);
    }
  };

  const handleSubmit = () => {
    if (isEditMode && editingGoal) {
      setGoals(goals.map(g => 
        g.id === editingGoal.id 
          ? { 
              ...g, 
              title: newGoal.title, 
              description: newGoal.description, 
              xpReward: Number(newGoal.xpReward), 
              coinsReward: Number(newGoal.coinsReward) 
            } 
          : g
      ));
    } else {
      addGoal();
    }
    resetForm();
  };
return (
    <div className="gradient-bg min-vh-100 py-4">
      <div className="container">
        {/* Header Card */}
        <div className="card card-glass mb-4">
          <div className="card-body p-4">
            <div className="row align-items-center">
              <div className="col-md-8">
                <div className="d-flex align-items-center gap-4">
                  <div className="position-relative">
                    <div className="avatar">
                      <Star className="w-8 h-8" />
                    </div>
                    <div className="level-badge">{user.level}</div>
                  </div>
                  <div>
                    <h1 className="h3 mb-3">Уровень {user.level}</h1>
                    <div style={{ width: '300px' }}>
                      <div className="progress" style={{ height: '16px' }}>
                        <div 
                          className="progress-bar" 
                          style={{ width: `${(user.xp / user.xpToNextLevel) * 100}%` }}
                        />
                      </div>
                      <small className="text-muted mt-1">
                        {user.xp} / {user.xpToNextLevel} XP
                      </small>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-4 text-end">
                <div className="coins-badge d-inline-flex align-items-center gap-2 p-3 rounded-3">
                  <Coins className="w-8 h-8" />
                  <span className="h4 mb-0">{user.coins}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Goals Section */}
        <div className="mb-4 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <Target className="w-6 h-6" />
            <h2 className="h4 mb-0">Мои цели</h2>
          </div>
          <button
            className="btn btn-gradient"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="w-5 h-5 me-2" />
            Добавить цель
          </button>
        </div>

        {/* Goals List */}
        <div className="row g-4">
          {goals.map(goal => (
            <div className="col-12" key={goal.id}>
              <div className={`card card-glass goal-card ${goal.completed ? 'completed' : ''}`}>
                <div className="card-body p-4">
                  <div className="row align-items-center">
                    <div className="col-md-6">
                      <h3 className="h5 mb-2">{goal.title}</h3>
                      <p className="text-muted mb-0">{goal.description}</p>
                    </div>
                    <div className="col-md-6">
                      <div className="d-flex gap-3 justify-content-md-end align-items-center">
                        <span className="xp-badge px-3 py-2 rounded-3">
                          <Trophy className="w-5 h-5 me-2" />
                          {goal.xpReward} XP
                        </span>
                        <span className="coins-badge px-3 py-2 rounded-3">
                          <Coins className="w-5 h-5 me-2" />
                          {goal.coinsReward}
                        </span>
                        {!goal.completed && (
                          <div className="d-flex gap-2 action-buttons">
                            <button
                              className="btn btn-edit px-3 py-2"
                              onClick={() => handleEdit(goal)}
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                              className="btn btn-delete px-3 py-2"
                              onClick={() => handleDelete(goal)}
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                            <button
                              className="btn btn-complete px-3 py-2"
                              onClick={() => completeGoal(goal.id)}
                            >
                              <CheckCircle className="w-5 h-5 me-2" />
                              Выполнено
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content card-glass">
                <div className="modal-header border-0">
                  <h5 className="modal-title">
                    {isEditMode ? 'Редактировать цель' : 'Новая цель'}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={resetForm}
                  />
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Название</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newGoal.title}
                      onChange={e => setNewGoal({ ...newGoal, title: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Описание</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={newGoal.description}
                      onChange={e => setNewGoal({ ...newGoal, description: e.target.value })}
                    />
                  </div>
                  <div className="row">
                    <div className="col-6">
                      <div className="mb-3">
                        <label className="form-label">XP награда</label>
                        <input
                          type="number"
                          className="form-control"
                          value={newGoal.xpReward}
                          onChange={e => setNewGoal({ ...newGoal, xpReward: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="mb-3">
                        <label className="form-label">Монеты</label>
                        <input
                          type="number"
                          className="form-control"
                          value={newGoal.coinsReward}
                          onChange={e => setNewGoal({ ...newGoal, coinsReward: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button
                    type="button"
                    className="btn btn-link text-decoration-none"
                    onClick={resetForm}
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    className="btn btn-gradient"
                    onClick={handleSubmit}
                  >
                    {isEditMode ? 'Сохранить' : 'Добавить цель'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Модальное окно подтверждения удаления */}
        {isDeleteModalOpen && deletingGoal && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content card-glass modal-delete">
                <div className="modal-header border-0">
                  <h5 className="modal-title">Удалить цель</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                      setDeletingGoal(null);
                    }}
                  />
                </div>
                <div className="modal-body">
                  <p>Вы уверены, что хотите удалить цель "{deletingGoal.title}"?</p>
                  <p className="text-muted">Это действие нельзя отменить.</p>
                </div>
                <div className="modal-footer border-0">
                  <button
                    type="button"
                    className="btn btn-link text-decoration-none"
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                      setDeletingGoal(null);
                    }}
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    className="btn btn-delete"
                    onClick={confirmDelete}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewPage;