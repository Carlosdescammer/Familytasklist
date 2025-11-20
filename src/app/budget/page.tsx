'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  Container,
  Title,
  Card,
  Stack,
  Group,
  Text,
  Button,
  Select,
  NumberInput,
  TextInput,
  Textarea,
  Modal,
  Table,
  Badge,
  Progress,
  Grid,
  Paper,
  ActionIcon,
  Menu,
  Loader,
  Alert,
  RingProgress,
} from '@mantine/core';
import {
  IconPlus,
  IconPigMoney,
  IconTrendingUp,
  IconTrendingDown,
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconReceipt,
  IconAlertCircle,
  IconCheck,
  IconCalendar,
  IconChartBar,
} from '@tabler/icons-react';
import { DateInput } from '@mantine/dates';
import AppLayout from '@/components/AppLayout';
import PageAccessGuard from '@/components/PageAccessGuard';

const EXPENSE_CATEGORIES = [
  'Groceries',
  'Utilities',
  'Transportation',
  'Entertainment',
  'Healthcare',
  'Education',
  'Dining Out',
  'Shopping',
  'Insurance',
  'Home Maintenance',
  'Other',
];

interface Budget {
  id: string;
  month: string;
  totalBudget: string;
  savingsGoal: string;
  notes: string | null;
}

interface Expense {
  id: string;
  category: string;
  amount: string;
  description: string;
  expenseDate: string;
  receiptUrl: string | null;
  notes: string | null;
  user: {
    name: string;
    email: string;
  } | null;
}

interface BudgetStats {
  month: string;
  budget: {
    id: string;
    totalBudget: number;
    savingsGoal: number;
    notes: string | null;
  } | null;
  spending: {
    totalSpent: number;
    expenseCount: number;
    remaining: number;
    percentUsed: number;
    onTrack: boolean;
  };
  savings: {
    goal: number;
    achieved: number;
    progress: number;
  };
  categoryBreakdown: {
    category: string;
    total: number;
    count: number;
    percentage: number;
  }[];
}

export default function BudgetPage() {
  const { user } = useCurrentUser();

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [budgetStats, setBudgetStats] = useState<BudgetStats | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Form states for budget
  const [budgetAmount, setBudgetAmount] = useState<number | ''>(0);
  const [savingsGoal, setSavingsGoal] = useState<number | ''>(0);
  const [budgetNotes, setBudgetNotes] = useState('');

  // Form states for expense
  const [expenseCategory, setExpenseCategory] = useState<string | null>(null);
  const [expenseAmount, setExpenseAmount] = useState<number | ''>(0);
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState<Date | null>(new Date());
  const [expenseNotes, setExpenseNotes] = useState('');

  const fetchBudgetStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/budget-stats?month=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setBudgetStats(data);
      }
    } catch (error) {
      console.error('Error fetching budget stats:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await fetch(`/api/expenses?month=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchBudgetStats();
    fetchExpenses();
  }, [fetchBudgetStats, fetchExpenses]);

  const handleCreateOrUpdateBudget = async () => {
    try {
      const budgetData = {
        month: selectedMonth,
        totalBudget: Number(budgetAmount),
        savingsGoal: Number(savingsGoal) || 0,
        notes: budgetNotes,
      };

      let res;
      if (editingBudget) {
        res = await fetch(`/api/budgets/${editingBudget.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(budgetData),
        });
      } else {
        res = await fetch('/api/budgets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(budgetData),
        });
      }

      if (res.ok) {
        setBudgetModalOpen(false);
        resetBudgetForm();
        fetchBudgetStats();
      }
    } catch (error) {
      console.error('Error saving budget:', error);
    }
  };

  const handleCreateOrUpdateExpense = async () => {
    try {
      const expenseData = {
        category: expenseCategory,
        amount: Number(expenseAmount),
        description: expenseDescription,
        expenseDate: expenseDate?.toISOString(),
        notes: expenseNotes,
      };

      let res;
      if (editingExpense) {
        res = await fetch(`/api/expenses/${editingExpense.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(expenseData),
        });
      } else {
        res = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(expenseData),
        });
      }

      if (res.ok) {
        setExpenseModalOpen(false);
        resetExpenseForm();
        fetchExpenses();
        fetchBudgetStats();
      }
    } catch (error) {
      console.error('Error saving expense:', error);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchExpenses();
        fetchBudgetStats();
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const openBudgetModal = () => {
    if (budgetStats?.budget) {
      setEditingBudget(budgetStats.budget as any);
      setBudgetAmount(budgetStats.budget.totalBudget);
      setSavingsGoal(budgetStats.budget.savingsGoal);
      setBudgetNotes(budgetStats.budget.notes || '');
    } else {
      resetBudgetForm();
    }
    setBudgetModalOpen(true);
  };

  const openExpenseModal = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      setExpenseCategory(expense.category);
      setExpenseAmount(parseFloat(expense.amount));
      setExpenseDescription(expense.description);
      setExpenseDate(new Date(expense.expenseDate));
      setExpenseNotes(expense.notes || '');
    } else {
      resetExpenseForm();
    }
    setExpenseModalOpen(true);
  };

  const resetBudgetForm = () => {
    setEditingBudget(null);
    setBudgetAmount(0);
    setSavingsGoal(0);
    setBudgetNotes('');
  };

  const resetExpenseForm = () => {
    setEditingExpense(null);
    setExpenseCategory(null);
    setExpenseAmount(0);
    setExpenseDescription('');
    setExpenseDate(new Date());
    setExpenseNotes('');
  };

  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = -6; i <= 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      options.push({ value, label });
    }
    return options;
  };

  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Number(amount));
  };

  const isParent = user?.role === 'parent';

  return (
    <AppLayout>
      <PageAccessGuard pageName="budget">
        <Container size="xl" py="xl">
        <Stack gap="lg">
          {/* Header */}
          <Group justify="space-between">
            <div>
              <Title order={1}>Budget Tracker</Title>
              <Text c="dimmed" size="sm">
                Manage your family budget and track expenses
              </Text>
            </div>
            <Group>
              <Select
                value={selectedMonth}
                onChange={(value) => value && setSelectedMonth(value)}
                data={generateMonthOptions()}
                leftSection={<IconCalendar size={16} />}
                w={200}
              />
            </Group>
          </Group>

          {loading ? (
            <Group justify="center" py="xl">
              <Loader size="lg" />
            </Group>
          ) : (
            <>
              {/* Budget Overview */}
              {!budgetStats?.budget && isParent ? (
                <Alert icon={<IconAlertCircle />} title="No Budget Set" color="yellow">
                  You haven&apos;t set a budget for this month yet.
                  <Button size="xs" ml="md" onClick={openBudgetModal}>
                    Set Budget
                  </Button>
                </Alert>
              ) : budgetStats?.budget ? (
                <Grid>
                  <Grid.Col span={{ base: 12, md: 4 }}>
                    <Paper p="md" withBorder>
                      <Stack gap="xs">
                        <Group justify="space-between">
                          <Text size="sm" c="dimmed">
                            Total Budget
                          </Text>
                          {isParent && (
                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              onClick={openBudgetModal}
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                          )}
                        </Group>
                        <Text size="xl" fw={700}>
                          {formatCurrency(budgetStats.budget.totalBudget)}
                        </Text>
                      </Stack>
                    </Paper>
                  </Grid.Col>

                  <Grid.Col span={{ base: 12, md: 4 }}>
                    <Paper p="md" withBorder>
                      <Stack gap="xs">
                        <Text size="sm" c="dimmed">
                          Total Spent
                        </Text>
                        <Text
                          size="xl"
                          fw={700}
                          c={budgetStats.spending.onTrack ? 'green' : 'red'}
                        >
                          {formatCurrency(budgetStats.spending.totalSpent)}
                        </Text>
                        <Progress
                          value={budgetStats.spending.percentUsed}
                          color={budgetStats.spending.onTrack ? 'blue' : 'red'}
                        />
                        <Text size="xs" c="dimmed">
                          {budgetStats.spending.percentUsed.toFixed(1)}% of budget used
                        </Text>
                      </Stack>
                    </Paper>
                  </Grid.Col>

                  <Grid.Col span={{ base: 12, md: 4 }}>
                    <Paper p="md" withBorder>
                      <Stack gap="xs">
                        <Text size="sm" c="dimmed">
                          Remaining
                        </Text>
                        <Group>
                          <Text
                            size="xl"
                            fw={700}
                            c={budgetStats.spending.remaining >= 0 ? 'green' : 'red'}
                          >
                            {formatCurrency(Math.abs(budgetStats.spending.remaining))}
                          </Text>
                          {budgetStats.spending.remaining >= 0 ? (
                            <IconTrendingUp size={24} color="green" />
                          ) : (
                            <IconTrendingDown size={24} color="red" />
                          )}
                        </Group>
                        {budgetStats.spending.remaining < 0 && (
                          <Text size="xs" c="red">
                            Over budget!
                          </Text>
                        )}
                      </Stack>
                    </Paper>
                  </Grid.Col>

                  {budgetStats.savings.goal > 0 && (
                    <Grid.Col span={12}>
                      <Card withBorder>
                        <Group justify="space-between">
                          <div>
                            <Text size="sm" c="dimmed">
                              Savings Goal Progress
                            </Text>
                            <Text size="lg" fw={500}>
                              {formatCurrency(budgetStats.savings.achieved)} of{' '}
                              {formatCurrency(budgetStats.savings.goal)}
                            </Text>
                          </div>
                          <RingProgress
                            size={80}
                            thickness={8}
                            sections={[
                              {
                                value: Math.min(budgetStats.savings.progress, 100),
                                color:
                                  budgetStats.savings.progress >= 100
                                    ? 'green'
                                    : 'blue',
                              },
                            ]}
                            label={
                              <Text size="xs" ta="center" fw={700}>
                                {budgetStats.savings.progress.toFixed(0)}%
                              </Text>
                            }
                          />
                        </Group>
                      </Card>
                    </Grid.Col>
                  )}
                </Grid>
              ) : null}

              {/* Category Breakdown */}
              {budgetStats?.categoryBreakdown && budgetStats.categoryBreakdown.length > 0 && (
                <Card withBorder>
                  <Stack gap="md">
                    <Group>
                      <IconChartBar size={20} />
                      <Title order={3}>Spending by Category</Title>
                    </Group>
                    <Stack gap="sm">
                      {budgetStats.categoryBreakdown.map((cat) => (
                        <div key={cat.category}>
                          <Group justify="space-between" mb={4}>
                            <Text size="sm">{cat.category}</Text>
                            <Text size="sm" fw={500}>
                              {formatCurrency(cat.total)} ({cat.percentage}%)
                            </Text>
                          </Group>
                          <Progress value={cat.percentage} color="blue" />
                        </div>
                      ))}
                    </Stack>
                  </Stack>
                </Card>
              )}

              {/* Expenses List */}
              <Card withBorder>
                <Stack gap="md">
                  <Group justify="space-between">
                    <Group>
                      <IconReceipt size={20} />
                      <Title order={3}>Expenses</Title>
                      <Badge>{expenses.length}</Badge>
                    </Group>
                    <Button
                      leftSection={<IconPlus size={16} />}
                      onClick={() => openExpenseModal()}
                    >
                      Add Expense
                    </Button>
                  </Group>

                  {expenses.length === 0 ? (
                    <Text c="dimmed" ta="center" py="xl">
                      No expenses recorded for this month
                    </Text>
                  ) : (
                    <Table>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Date</Table.Th>
                          <Table.Th>Category</Table.Th>
                          <Table.Th>Description</Table.Th>
                          <Table.Th>Added By</Table.Th>
                          <Table.Th ta="right">Amount</Table.Th>
                          <Table.Th></Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {expenses.map((expense) => (
                          <Table.Tr key={expense.id}>
                            <Table.Td>
                              {new Date(expense.expenseDate).toLocaleDateString()}
                            </Table.Td>
                            <Table.Td>
                              <Badge variant="light">{expense.category}</Badge>
                            </Table.Td>
                            <Table.Td>{expense.description}</Table.Td>
                            <Table.Td>
                              {expense.user?.name || 'Unknown'}
                            </Table.Td>
                            <Table.Td ta="right" fw={500}>
                              {formatCurrency(expense.amount)}
                            </Table.Td>
                            <Table.Td>
                              <Menu>
                                <Menu.Target>
                                  <ActionIcon variant="subtle">
                                    <IconDotsVertical size={16} />
                                  </ActionIcon>
                                </Menu.Target>
                                <Menu.Dropdown>
                                  <Menu.Item
                                    leftSection={<IconEdit size={16} />}
                                    onClick={() => openExpenseModal(expense)}
                                  >
                                    Edit
                                  </Menu.Item>
                                  <Menu.Item
                                    leftSection={<IconTrash size={16} />}
                                    color="red"
                                    onClick={() => handleDeleteExpense(expense.id)}
                                  >
                                    Delete
                                  </Menu.Item>
                                </Menu.Dropdown>
                              </Menu>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  )}
                </Stack>
              </Card>
            </>
          )}
        </Stack>

        {/* Budget Modal */}
        <Modal
          opened={budgetModalOpen}
          onClose={() => {
            setBudgetModalOpen(false);
            resetBudgetForm();
          }}
          title={editingBudget ? 'Edit Budget' : 'Set Monthly Budget'}
        >
          <Stack gap="md">
            <NumberInput
              label="Total Budget"
              placeholder="Enter total budget"
              value={budgetAmount}
              onChange={(value) => setBudgetAmount(value as number | '')}
              min={0}
              prefix="$"
              decimalScale={2}
              required
            />
            <NumberInput
              label="Savings Goal"
              placeholder="Optional savings goal"
              value={savingsGoal}
              onChange={(value) => setSavingsGoal(value as number | '')}
              min={0}
              prefix="$"
              decimalScale={2}
            />
            <Textarea
              label="Notes"
              placeholder="Optional notes about this budget"
              value={budgetNotes}
              onChange={(e) => setBudgetNotes(e.currentTarget.value)}
              rows={3}
            />
            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => setBudgetModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateOrUpdateBudget}>
                {editingBudget ? 'Update' : 'Create'} Budget
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Expense Modal */}
        <Modal
          opened={expenseModalOpen}
          onClose={() => {
            setExpenseModalOpen(false);
            resetExpenseForm();
          }}
          title={editingExpense ? 'Edit Expense' : 'Add New Expense'}
        >
          <Stack gap="md">
            <Select
              label="Category"
              placeholder="Select category"
              value={expenseCategory}
              onChange={setExpenseCategory}
              data={EXPENSE_CATEGORIES}
              required
            />
            <NumberInput
              label="Amount"
              placeholder="Enter amount"
              value={expenseAmount}
              onChange={(value) => setExpenseAmount(value as number | '')}
              min={0}
              prefix="$"
              decimalScale={2}
              required
            />
            <TextInput
              label="Description"
              placeholder="What was this expense for?"
              value={expenseDescription}
              onChange={(e) => setExpenseDescription(e.currentTarget.value)}
              required
            />
            <DateInput
              label="Date"
              placeholder="Select date"
              value={expenseDate}
              onChange={setExpenseDate}
              required
            />
            <Textarea
              label="Notes"
              placeholder="Optional notes"
              value={expenseNotes}
              onChange={(e) => setExpenseNotes(e.currentTarget.value)}
              rows={3}
            />
            <Group justify="flex-end">
              <Button
                variant="subtle"
                onClick={() => setExpenseModalOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateOrUpdateExpense}>
                {editingExpense ? 'Update' : 'Add'} Expense
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Container>
      </PageAccessGuard>
    </AppLayout>
  );
}
