
import React, { useState } from 'react';
import { Button, Input, InputNumber, Select, Slider, Table, Modal, Card, Row, Col, Typography, Tag, message, Space, Divider, List, Progress } from 'antd';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { InfoCircleOutlined, BarChartOutlined, FireOutlined, PlusOutlined, CloudServerOutlined, ThunderboltOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Text } = Typography;

export default function App() {
  // --- 1. Data State ---
  const [tasks, setTasks] = useState([]); 
  const [inputs, setInputs] = useState({
    name: 'New Feature',
    reach: 1000,
    impact: 2.0,
    confidence: 80,
    strategy: 1.0,
    effort: 10,
  });
  const [sprintCapacity, setSprintCapacity] = useState(40); 
  const [loading, setLoading] = useState(false);

  // Modal Visibility State
  const [isChartOpen, setIsChartOpen] = useState(false); 
  const [isAboutOpen, setIsAboutOpen] = useState(false); 

  // --- 2. Handle Input Change ---
  const handleChange = (key, value) => {
    setInputs({ ...inputs, [key]: value });
  };

  // --- 3. Add Task ---
  const handleAdd = () => {
    if (inputs.effort <= 0) {
      message.error("Effort must be > 0");
      return;
    }
    const newTask = {
      id: Date.now(),
      ...inputs,
      score: 0 
    };
    setTasks([...tasks, newTask]);
    message.success("Task Added to List");
  };

  // --- 4. Call Java Backend ---
  const handleAnalyze = async () => {
    if (tasks.length === 0) {
      message.warning("List is empty!");
      return;
    }

    setLoading(true);
    const hideLoading = message.loading("Connecting to Java Backend...", 0);

    try {
      const updatedTasks = await Promise.all(tasks.map(async (t) => {
        const response = await fetch('http://localhost:8080/api/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: t.name,
            reach: t.reach,
            impact: t.impact,
            confidence: t.confidence,
            strategy: t.strategy,
            effort: t.effort
          })
        });

        if (!response.ok) throw new Error("Backend connection failed");
        const data = await response.json();
        return { ...t, score: data.finalScore };
      }));

      updatedTasks.sort((a, b) => b.score - a.score);
      setTasks(updatedTasks);
      hideLoading();
      message.success("Success! Calculated by Java Spring Boot.");
    } catch (error) {
      hideLoading();
      console.error(error);
      message.error("Failed to connect to Java Backend! Is it running?");
    } finally {
      setLoading(false);
    }
  };

  // --- 5. Sprint Auto-Plan ---
  const handleAutoPlan = () => {
    if (tasks.length === 0 || tasks[0].score === 0) {
      message.warning("Please Analyze & Sort first!");
      return;
    }

    let currentEffort = 0;
    const selectedTasks = [];
    
    for (const task of tasks) {
      if (currentEffort + task.effort <= sprintCapacity) {
        selectedTasks.push(task);
        currentEffort += task.effort;
      }
    }

    Modal.info({
      title: <span><ThunderboltOutlined style={{ color: '#722ed1' }} /> Sprint Auto-Plan Result</span>,
      width: 600,
      content: (
        <div>
          <p>Based on capacity: <b>{sprintCapacity} Person-Days</b></p>
          <Progress percent={Math.round((currentEffort / sprintCapacity) * 100)} status="active" strokeColor="#722ed1" />
          <p style={{ marginTop: 10 }}>Selected <b>{selectedTasks.length}</b> top priority tasks:</p>
          <List
            size="small"
            bordered
            dataSource={selectedTasks}
            renderItem={(item, index) => (
              <List.Item>
                <Tag color="purple">#{index + 1}</Tag> 
                <b>{item.name}</b> (Score: {item.score.toFixed(1)}, Effort: {item.effort})
              </List.Item>
            )}
          />
          <div style={{ marginTop: 15, textAlign: 'right', color: '#888' }}>
            Total Effort Used: {currentEffort} / {sprintCapacity}
          </div>
        </div>
      ),
    });
  };

  // --- Table Columns ---
  const rawColumns = [
    { title: 'Task Name', dataIndex: 'name', key: 'name', width: 200 },
    { title: 'Reach', dataIndex: 'reach', key: 'reach', width: 100 },
    { title: 'Impact', dataIndex: 'impact', key: 'impact', width: 100 },
    { title: 'Confidence', dataIndex: 'confidence', key: 'confidence', width: 100, render: v => v + '%' },
    { title: 'Strategy', dataIndex: 'strategy', key: 'strategy', width: 100, render: v => 'x' + v },
    { title: 'Effort', dataIndex: 'effort', key: 'effort', width: 100 },
  ];

  const sortedColumns = [
    { 
      title: 'Rank', key: 'rank', width: 80, 
      render: (text, record, index) => <Tag color={index === 0 ? "green" : "blue"}>#{index + 1}</Tag> 
    },
    { 
      title: 'RICE Score', dataIndex: 'score', key: 'score', width: 120, sorter: (a, b) => a.score - b.score,
      render: (val) => <b style={{ color: '#cf1322' }}>{val.toFixed(1)}</b> 
    },
    { title: 'Task Name', dataIndex: 'name', key: 'name' },
    { title: 'Effort Cost', dataIndex: 'effort', key: 'effort', width: 120, render: v => <Tag>{v} Days</Tag> },
  ];

  return (
    <div style={{ padding: '20px', background: '#f5f7fa', minHeight: '100vh' }}>
      <Card 
        title={<span><CloudServerOutlined style={{ color: '#1890ff' }} /> Full-Stack RICE+S Task Manager</span>} 
        style={{ marginBottom: 20, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
      >
        
        {/* Input Area */}
        <Space wrap size="large" style={{ marginBottom: 20, width: '100%' }}>
          <Input addonBefore="Task Name" value={inputs.name} onChange={e => handleChange('name', e.target.value)} style={{ width: 220 }} />
          <InputNumber addonBefore="Reach" value={inputs.reach} onChange={v => handleChange('reach', v)} style={{ width: 140 }} />
          
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: 8 }}>Impact:</span>
            <Select value={inputs.impact} onChange={v => handleChange('impact', v)} style={{ width: 120 }}>
              <Option value={3.0}>3.0 (Massive)</Option>
              <Option value={2.0}>2.0 (High)</Option>
              <Option value={1.0}>1.0 (Medium)</Option>
              <Option value={0.5}>0.5 (Low)</Option>
            </Select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: 8 }}>Confidence:</span>
            <div style={{ width: 100 }}>
              <Slider value={inputs.confidence} onChange={v => handleChange('confidence', v)} />
            </div>
            <span style={{ marginLeft: 8 }}>{inputs.confidence}%</span>
          </div>

          <InputNumber addonBefore="Strategy" step={0.5} value={inputs.strategy} onChange={v => handleChange('strategy', v)} style={{ width: 130 }} />
          <InputNumber addonBefore="Effort" value={inputs.effort} onChange={v => handleChange('effort', v)} style={{ width: 130 }} />
        </Space>

        <Divider dashed />

        {/* Buttons Area */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Button icon={<PlusOutlined />} onClick={handleAdd} size="large">Add to List</Button>
            
            <Button type="primary" danger icon={<FireOutlined />} onClick={handleAnalyze} loading={loading} size="large">
              Analyze via Java
            </Button>
            
            <Button style={{ background: '#fa8c16', color: 'white', border: 'none' }} icon={<BarChartOutlined />} onClick={() => setIsChartOpen(true)} size="large">
              Visualize
            </Button>
            
            <Button type="default" icon={<InfoCircleOutlined />} onClick={() => setIsAboutOpen(true)} size="large">
              About Model
            </Button>
          </Space>

          {/* Sprint Auto-Plan Area */}
          <div style={{ background: '#f9f0ff', padding: '10px 15px', borderRadius: '6px', border: '1px solid #d3adf7' }}>
            <Space>
              <span style={{ color: '#722ed1', fontWeight: 'bold' }}>Sprint Capacity:</span>
              <InputNumber 
                value={sprintCapacity} 
                onChange={setSprintCapacity} 
                style={{ width: 70 }} 
                min={1}
              />
              <Button type="primary" style={{ background: '#722ed1', borderColor: '#722ed1' }} icon={<ThunderboltOutlined />} onClick={handleAutoPlan}>
                Auto-Plan
              </Button>
            </Space>
          </div>
        </div>
      </Card>

      {/* Tables Area */}
      <Row gutter={24}>
        <Col span={12}>
          <Card title="1. Task Pool (Frontend Data)" bordered={false} style={{ borderRadius: 8 }}>
            <Table dataSource={tasks} columns={rawColumns} rowKey="id" pagination={false} size="middle" />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="2. Prioritized Results (From Backend)" bordered={false} style={{ borderRadius: 8 }}>
            <Table dataSource={tasks} columns={sortedColumns} rowKey="id" pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>

      {/* Chart Modal */}
      <Modal title="RICE Score Visualization" open={isChartOpen} onCancel={() => setIsChartOpen(false)} footer={null} width={800}>
        <div style={{ height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tasks} layout="vertical" margin={{ left: 20, right: 30 }}>
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} />
              <Tooltip />
              <Bar dataKey="score" name="RICE Score" fill="#8884d8">
                {tasks.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#52c41a' : '#1890ff'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Modal>

      {/* About Modal (Full English) */}
      <Modal 
        title="About RICE+S Prioritization Model" 
        open={isAboutOpen} 
        onOk={() => setIsAboutOpen(false)} 
        onCancel={() => setIsAboutOpen(false)}
        width={600}
      >
        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
          <p><b>Backend:</b> Java Spring Boot (Port 8080)</p>
          <p><b>Frontend:</b> React + Ant Design (Port 5173)</p>
          <Divider />
          <h4 style={{ color: '#1890ff' }}>Formula</h4>
          <code style={{ background: '#f0f0f0', padding: '4px 8px', borderRadius: '4px', display: 'block', marginTop: '5px' }}>
            (Reach × Impact × Confidence × Strategy) / Effort
          </code>
          <Divider />
          <h4>Parameters Explained</h4>
          <ul style={{ paddingLeft: '20px' }}>
            <li><b>Reach:</b> How many users will be affected? (e.g., 1000)</li>
            <li><b>Impact:</b> How big is the effect on each user?
              <br /><Text type="secondary">3.0 = Massive, 2.0 = High, 1.0 = Medium, 0.5 = Low</Text>
            </li>
            <li><b>Confidence:</b> How sure are you about the estimates? (e.g., 80%)</li>
            <li><b>Strategy:</b> Strategic Fit Multiplier (RICE Extension).
              <br /><Text type="secondary">2.0 = Core Strategy, 1.0 = Normal, 0.5 = Low Fit</Text>
            </li>
            <li><b>Effort:</b> Time cost (Person-Days).</li>
          </ul>
        </div>
      </Modal>

    </div>
  );
}
    


