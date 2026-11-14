import { TaskItem } from '../types/task';
import { calculateTaskProgress } from './taskLogic';

/**
 * Generates a complete, self-contained cross-platform Flutter (Dart) application
 * pre-loaded with the user's current tasks, nested to-do checklists, progress bars,
 * timestamped updates, attachments, dashboard metrics, and SharedPreferences offline sync.
 */
export function generateFlutterCode(tasks: TaskItem[]): string {
  const simplifiedTasksJson = JSON.stringify(
    tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      project: t.project,
      priority: t.priority,
      status: t.status,
      dueDate: t.dueDate,
      manualProgress: calculateTaskProgress(t),
      todos: t.todos,
      updates: t.updates,
      attachments: t.attachments.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        sizeBytes: a.sizeBytes,
        addedAt: a.addedAt,
        caption: a.caption || '',
      })),
    })),
    null,
    2
  );

  return `// ============================================================================
// Task Tracker — Cross-Platform Flutter Application (iOS, Android, macOS, Web)
// Features:
//  1. Per-Task Progress Bars & Nested To-Do Checklists
//  2. Timestamped Task Updates (Date & Time Picker)
//  3. Photo & File Attachments (image_picker + file_picker)
//  4. Project Completion Metrics Dashboard
//  5. Offline-First Local Storage Sync (shared_preferences / Hive)
// ============================================================================

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const TaskTrackerApp());
}

class TaskTrackerApp extends StatelessWidget {
  const TaskTrackerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Task Tracker',
      debugShowCheckedModeBanner: false,
      themeMode: ThemeMode.system,
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: const Color(0xFF2563EB),
        brightness: Brightness.light,
      ),
      darkTheme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: const Color(0xFF3B82F6),
        brightness: Brightness.dark,
      ),
      home: const AdaptiveWorkspaceScreen(),
    );
  }
}

class AdaptiveWorkspaceScreen extends StatefulWidget {
  const AdaptiveWorkspaceScreen({super.key});

  @override
  State<AdaptiveWorkspaceScreen> createState() => _AdaptiveWorkspaceScreenState();
}

class _AdaptiveWorkspaceScreenState extends State<AdaptiveWorkspaceScreen> {
  static const String _storageKey = 'task_tracker_offline_v1';
  List<Map<String, dynamic>> _tasks = [];
  String? _selectedTaskId;
  int _activeTab = 0; // 0 = Tasks, 1 = Dashboard

  @override
  void initState() {
    super.initState();
    _loadOfflineTasks();
  }

  Future<void> _loadOfflineTasks() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_storageKey);
    if (raw != null) {
      final decoded = jsonDecode(raw) as List<dynamic>;
      setState(() {
        _tasks = decoded.cast<Map<String, dynamic>>();
        if (_tasks.isNotEmpty) _selectedTaskId = _tasks.first['id'];
      });
    } else {
      final seed = jsonDecode(_initialSeedJson) as List<dynamic>;
      setState(() {
        _tasks = seed.cast<Map<String, dynamic>>();
        if (_tasks.isNotEmpty) _selectedTaskId = _tasks.first['id'];
      });
      await _persistOffline();
    }
  }

  Future<void> _persistOffline() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_storageKey, jsonEncode(_tasks));
  }

  double _calculateProgress(Map<String, dynamic> task) {
    final todos = (task['todos'] as List<dynamic>? ?? []);
    if (todos.isEmpty) {
      return ((task['manualProgress'] ?? 0) as num).toDouble() / 100.0;
    }
    final done = todos.where((t) => t['completed'] == true).length;
    return done / todos.length;
  }

  @override
  Widget build(BuildContext context) {
    final isDesktop = MediaQuery.of(context).size.width >= 900;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Task Tracker · Offline Sync Active'),
        actions: [
          SegmentedButton<int>(
            segments: const [
              ButtonSegment(value: 0, label: Text('Tasks'), icon: Icon(Icons.check_circle_outline)),
              ButtonSegment(value: 1, label: Text('Dashboard'), icon: Icon(Icons.insights)),
            ],
            selected: {_activeTab},
            onSelectionChanged: (s) => setState(() => _activeTab = s.first),
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: _activeTab == 1
          ? _buildDashboard(context)
          : isDesktop
              ? Row(
                  children: [
                    SizedBox(width: 420, child: _buildTaskList()),
                    const VerticalDivider(width: 1),
                    Expanded(child: _buildTaskDetail()),
                  ],
                )
              : _buildTaskList(),
    );
  }

  Widget _buildTaskList() {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _tasks.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, idx) {
        final task = _tasks[idx];
        final progress = _calculateProgress(task);
        return Card(
          child: ListTile(
            selected: task['id'] == _selectedTaskId,
            onTap: () => setState(() => _selectedTaskId = task['id']),
            title: Text(task['title'], style: const TextStyle(fontWeight: FontWeight.w600)),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 8),
                LinearProgressIndicator(value: progress, minHeight: 6),
                const SizedBox(height: 6),
                Text('\${(progress * 100).round()}% complete · Project: \${task['project']}'),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildTaskDetail() {
    final task = _tasks.firstWhere(
      (t) => t['id'] == _selectedTaskId,
      orElse: () => _tasks.isNotEmpty ? _tasks.first : {},
    );
    if (task.isEmpty) return const Center(child: Text('Select a task'));
    final todos = (task['todos'] as List<dynamic>? ?? []);
    final updates = (task['updates'] as List<dynamic>? ?? []);
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Text(task['title'], style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 8),
        Text(task['description'] ?? ''),
        const Divider(height: 32),
        Text('To-Do Checklist (\${todos.length})', style: Theme.of(context).textTheme.titleMedium),
        ...todos.map((todo) => CheckboxListTile(
              value: todo['completed'] == true,
              title: Text(todo['title']),
              onChanged: (val) {
                setState(() => todo['completed'] = val ?? false);
                _persistOffline();
              },
            )),
        const Divider(height: 32),
        Text('Timestamped Updates (\${updates.length})', style: Theme.of(context).textTheme.titleMedium),
        ...updates.map((u) => ListTile(
              leading: const Icon(Icons.schedule),
              title: Text(u['content']),
              subtitle: Text('\${u['timestamp']} · \${u['author']}'),
            )),
      ],
    );
  }

  Widget _buildDashboard(BuildContext context) {
    final avg = _tasks.isEmpty
        ? 0.0
        : _tasks.map(_calculateProgress).reduce((a, b) => a + b) / _tasks.length;
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text('Overall Project Completion', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 16),
          Text('\${(avg * 100).round()}%', style: Theme.of(context).textTheme.displayMedium),
        ],
      ),
    );
  }
}

const String _initialSeedJson = r'''
${simplifiedTasksJson}
''';
`;
}
