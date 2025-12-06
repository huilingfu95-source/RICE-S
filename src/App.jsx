import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, InputNumber, Select, Slider, Table, Modal, Card, Row, Col, Typography, Tag, message, Space, Divider, List, Progress } from 'antd';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { InfoCircleOutlined, BarChartOutlined, FireOutlined, PlusOutlined, CloudServerOutlined, ThunderboltOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Text } = Typography;

export default function App() {
  // --- 1. Animation State Control ---
  const [inIntro, setInIntro] = useState(true);

  // --- 2. Core Business Data State (Fully Preserved) ---
  const [tasks, setTasks] = useState([]); 
  const [inputs, setInputs] = useState({
    name: 'New Feature', reach: 1000, impact: 2.0, confidence: 80, strategy: 1.0, effort: 10,
  });
  const [sprintCapacity, setSprintCapacity] = useState(40); 
  const [loading, setLoading] = useState(false);
  const [isChartOpen, setIsChartOpen] = useState(false); 
  const [isAboutOpen, setIsAboutOpen] = useState(false); 

  // --- 3. Business Logic Functions (Fully Preserved) ---
  const handleChange = (key, value) => setInputs({ ...inputs, [key]: value });

  const handleAdd = () => {
    if (inputs.effort <= 0) { message.error("Effort must be > 0"); return; }
    const newTask = { id: Date.now(), ...inputs, score: 0 };
    setTasks([...tasks, newTask]);
    message.success("Task Added to List");
  };

  const handleAnalyze = async () => {
    if (tasks.length === 0) { message.warning("List is empty!"); return; }
    setLoading(true);
    const hideLoading = message.loading("Connecting to Java Backend...", 0);
    try {
      const updatedTasks = await Promise.all(tasks.map(async (t) => {
        const response = await fetch('http://localhost:8080/api/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: t.name, reach: t.reach, impact: t.impact, confidence: t.confidence, strategy: t.strategy, effort: t.effort
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
      message.error("Failed to connect to Java Backend! Using local fallback.");
      // Fallback logic for demo purposes
      setTasks(tasks.map(t => ({...t, score: (t.reach*t.impact*t.confidence/100*t.strategy)/t.effort})).sort((a,b)=>b.score-a.score));
    } finally {
      setLoading(false);
    }
  };

  const handleAutoPlan = () => {
    if (tasks.length === 0 || tasks[0].score === 0) { message.warning("Please Analyze & Sort first!"); return; }
    let currentEffort = 0;
    const selectedTasks = [];
    for (const task of tasks) {
      if (currentEffort + task.effort <= sprintCapacity) {
        selectedTasks.push(task);
        currentEffort += task.effort;
      }
    }
    Modal.info({
      title: <span style={{color:'#fff'}}><ThunderboltOutlined style={{ color: '#f4d35e' }} /> Sprint Auto-Plan Result</span>,
      width: 600,
      className: 'glass-modal',
      content: (
        <div>
          <p style={{color:'#ccc'}}>Based on capacity: <b style={{color:'#fff'}}>{sprintCapacity} Person-Days</b></p>
          <Progress percent={Math.round((currentEffort / sprintCapacity) * 100)} status="active" strokeColor="#f4d35e" trailColor="rgba(255,255,255,0.1)" />
          <p style={{ marginTop: 10, color:'#ccc' }}>Selected <b style={{color:'#fff'}}>{selectedTasks.length}</b> top priority tasks:</p>
          <List
            size="small" bordered dataSource={selectedTasks}
            style={{borderColor:'rgba(255,255,255,0.1)'}}
            renderItem={(item, index) => (
              <List.Item style={{color:'#fff', borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
                <Tag color="gold" style={{color:'#000'}}>#{index + 1}</Tag> 
                <b>{item.name}</b> (Score: {item.score.toFixed(1)}, Effort: {item.effort})
              </List.Item>
            )}
          />
        </div>
      ),
    });
  };

  // --- 4. Animation Engine Logic ---
  const canvasRef = useRef(null);
  const requestRef = useRef();
  const speedRef = useRef(0.5);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width; canvas.height = height;

    const stars = Array.from({ length: 800 }).map(() => ({
      x: Math.random() * width - width / 2,
      y: Math.random() * height - height / 2,
      z: Math.random() * width
    }));

    const render = () => {
      ctx.fillStyle = '#050810'; ctx.fillRect(0, 0, width, height);
      const cx = width / 2; const cy = height / 2;
      stars.forEach(star => {
        star.z -= speedRef.current;
        if (star.z <= 0) {
          star.z = width; star.x = Math.random() * width - width / 2; star.y = Math.random() * height - height / 2;
        }
        const scale = width / star.z;
        const x2d = cx + star.x * scale;
        const y2d = cy + star.y * scale;
        if (x2d >= 0 && x2d <= width && y2d >= 0 && y2d <= height) {
          const size = (1 - star.z / width) * 3;
          const alpha = (1 - star.z / width);
          // ⚡️ Logic here: draw dots normally, draw long strips (white) when accelerating
          if (speedRef.current > 10) {
            ctx.fillStyle = '#fff'; ctx.fillRect(x2d, y2d, size, size * 20); 
          } else {
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`; ctx.beginPath(); ctx.arc(x2d, y2d, size, 0, Math.PI * 2); ctx.fill();
          }
        }
      });
      requestRef.current = requestAnimationFrame(render);
    };
    render();
    const handleResize = () => { width = window.innerWidth; height = window.innerHeight; canvas.width = width; canvas.height = height; };
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); cancelAnimationFrame(requestRef.current); };
  }, []);

  const handleLaunch = () => {
    let accelTimer = setInterval(() => { speedRef.current += 3; if (speedRef.current > 60) clearInterval(accelTimer); }, 20);
    // Switch interface after 1 second
    setTimeout(() => { setInIntro(false); speedRef.current = 0.5; }, 1000);
  };

  // --- 5. Styles & Render ---
  const rawColumns = [
    { title: 'Task Name', dataIndex: 'name', width: 200, render: t => <span style={{color:'#fff'}}>{t}</span> },
    { title: 'Reach', dataIndex: 'reach', width: 100 },
    { title: 'Impact', dataIndex: 'impact', width: 100 },
    { title: 'Confidence', dataIndex: 'confidence', width: 100, render: v => v + '%' },
    { title: 'Strategy', dataIndex: 'strategy', width: 100, render: v => 'x' + v },
    { title: 'Effort', dataIndex: 'effort', width: 100 },
  ];
  const sortedColumns = [
    { title: 'Rank', width: 80, render: (t, r, i) => <Tag color={i === 0 ? "gold" : "cyan"}>#{i + 1}</Tag> },
    { title: 'RICE Score', dataIndex: 'score', width: 120, sorter: (a, b) => a.score - b.score, render: v => <b style={{ color: '#f4d35e', fontSize: 16 }}>{v.toFixed(1)}</b> },
    { title: 'Task Name', dataIndex: 'name', render: t => <span style={{color:'#fff'}}>{t}</span> },
    { title: 'Effort Cost', dataIndex: 'effort', width: 120, render: v => <Tag>{v} Days</Tag> },
  ];

  const styles = `
    html, body, #root { margin:0; width:100%; height:100%; overflow:hidden; background:#000; font-family:'Segoe UI'; }
    .star-canvas { position: fixed; top: 0; left: 0; z-index: 0; }
    .ui-layer { position: fixed; inset: 0; z-index: 10; pointer-events: none; }
    .intro-screen { pointer-events: auto; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }
    .main-screen { pointer-events: auto; width: 100%; height: 100%; overflow-y: auto; padding: 20px; animation: fadeIn 1.5s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
    
    /* Card styles (Glassmorphism) */
    .glass-card { background: rgba(20, 30, 50, 0.75) !important; backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.15) !important; border-radius: 12px !important; }
    .ant-card-head, .ant-card-head-title, .ant-card-body { color: #fff !important; border-bottom-color: rgba(255,255,255,0.1) !important; }
    
    /* Input field adaptation */
    .ant-input-group-addon { background: rgba(255,255,255,0.1) !important; color: #fff !important; border-color: #444 !important; }
    .ant-input, .ant-input-number, .ant-select-selector { background: rgba(0,0,0,0.3) !important; border-color: #444 !important; color: #fff !important; }
    .ant-typography, span { color: #fff; }
    .ant-table { background: transparent !important; color: #fff !important; }
    .ant-table-thead > tr > th { background: rgba(255,255,255,0.1) !important; color: #8cbceb !important; border: none !important; }
    .ant-table-tbody > tr > td { border-bottom: 1px solid rgba(255,255,255,0.05) !important; color: #fff !important; }
    .ant-table-tbody > tr:hover > td { background: rgba(255,255,255,0.1) !important; }
    .ant-modal-content { background: #1f1f1f !important; border: 1px solid #444; }
    .ant-modal-header { background: #1f1f1f !important; border-bottom: 1px solid #333 !important; }
    .ant-modal-title, .ant-modal-close { color: #fff !important; }
  `;

  return (
    <>
      <style>{styles}</style>
      <canvas ref={canvasRef} className="star-canvas" />

      <div className="ui-layer">
        {inIntro ? (
          <div className="intro-screen">
            {/* --- Intro Animation Screen --- */}
            <h1 style={{fontSize:'5rem', color:'#fff', margin:0, textShadow:'0 0 50px #fff'}}>RICE+S</h1>
            <p style={{color:'#8cbceb', letterSpacing:5, marginBottom:50}}>PRIORITIZATION ENGINE</p>
            
            {/* ⚡️⚡️⚡️ Core Fix: Force display ENTRY SYSTEM ⚡️⚡️⚡️ */}
            <Button 
              type="primary" 
              size="large" 
              style={{
                width: 260, 
                height: 55, 
                borderRadius: 30, 
                background: '#ffffff', // Pure white background
                color: '#000000 !important', // Pure black text, forced
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                boxShadow: '0 0 25px rgba(255,255,255,0.6)',
                fontSize: '18px',
                fontWeight: '900'
              }} 
              onClick={handleLaunch}
            >
              <span style={{ color: '#000000', marginRight: '10px', fontWeight: 'bold' }}>ENTRY SYSTEM</span>
              <span style={{ fontSize: '22px' }}>🚀</span>
            </Button>
            {/* ⚡️⚡️⚡️ Fix End ⚡️⚡️⚡️ */}

          </div>
        ) : (
          <div className="main-screen">
            {/* --- Main Function Interface --- */}
            <Card 
              title={<span><CloudServerOutlined style={{ color: '#f4d35e' }} /> Full-Stack RICE+S Task Manager</span>} 
              className="glass-card" bordered={false} style={{ marginBottom: 20 }}
            >
              <Space wrap size="large" style={{ marginBottom: 20, width: '100%' }}>
                <Input addonBefore="Task Name" value={inputs.name} onChange={e => handleChange('name', e.target.value)} style={{ width: 220 }} />
                <InputNumber addonBefore="Reach" value={inputs.reach} onChange={v => handleChange('reach', v)} style={{ width: 140 }} />
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: 8, color: '#8cbceb' }}>Impact:</span>
                  <Select value={inputs.impact} onChange={v => handleChange('impact', v)} style={{ width: 120 }}>
                    <Option value={3.0}>3.0 (Massive)</Option><Option value={2.0}>2.0 (High)</Option><Option value={1.0}>1.0 (Medium)</Option><Option value={0.5}>0.5 (Low)</Option>
                  </Select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: 8, color: '#8cbceb' }}>Confidence:</span>
                  <div style={{ width: 100 }}><Slider value={inputs.confidence} onChange={v => handleChange('confidence', v)} trackStyle={{background:'#f4d35e'}} /></div>
                  <span style={{ marginLeft: 8 }}>{inputs.confidence}%</span>
                </div>
                <InputNumber addonBefore="Strategy" step={0.5} value={inputs.strategy} onChange={v => handleChange('strategy', v)} style={{ width: 130 }} />
                <InputNumber addonBefore="Effort" value={inputs.effort} onChange={v => handleChange('effort', v)} style={{ width: 130 }} />
              </Space>

              <Divider dashed style={{borderColor:'rgba(255,255,255,0.1)'}} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <Space>
                  <Button icon={<PlusOutlined />} onClick={handleAdd} size="large" style={{background:'rgba(255,255,255,0.1)', color:'#fff', border:'none'}}>Add to List</Button>
                  <Button type="primary" danger icon={<FireOutlined />} onClick={handleAnalyze} loading={loading} size="large">Analyze via Java</Button>
                  <Button style={{ background: '#fa8c16', color: 'white', border: 'none' }} icon={<BarChartOutlined />} onClick={() => setIsChartOpen(true)} size="large">Visualize</Button>
                  <Button type="default" icon={<InfoCircleOutlined />} onClick={() => setIsAboutOpen(true)} size="large" ghost>About Model</Button>
                </Space>
                <div style={{ background: 'rgba(114, 46, 209, 0.2)', padding: '10px 15px', borderRadius: '6px', border: '1px solid #722ed1' }}>
                  <Space>
                    <span style={{ color: '#d3adf7', fontWeight: 'bold' }}>Sprint Capacity:</span>
                    <InputNumber value={sprintCapacity} onChange={setSprintCapacity} style={{ width: 70 }} min={1} />
                    <Button type="primary" style={{ background: '#722ed1', borderColor: '#722ed1' }} icon={<ThunderboltOutlined />} onClick={handleAutoPlan}>Auto-Plan</Button>
                  </Space>
                </div>
              </div>
            </Card>

            <Row gutter={24}>
              <Col span={12}>
                <Card title="1. Task Pool (Frontend Data)" bordered={false} className="glass-card">
                  <Table dataSource={tasks} columns={rawColumns} rowKey="id" pagination={false} size="middle" />
                </Card>
              </Col>
              <Col span={12}>
                <Card title="2. Prioritized Results (From Backend)" bordered={false} className="glass-card">
                  <Table dataSource={tasks} columns={sortedColumns} rowKey="id" pagination={false} size="middle" />
                </Card>
              </Col>
            </Row>
          </div>
        )}

        {/* --- Modals (Preserve your content) --- */}
        <Modal title="RICE Score Visualization" open={isChartOpen} onCancel={() => setIsChartOpen(false)} footer={null} width={800}>
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tasks} layout="vertical" margin={{ left: 20, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis type="number" stroke="#fff" />
                <YAxis dataKey="name" type="category" width={120} stroke="#fff" />
                <Tooltip contentStyle={{background:'#333', border:'1px solid #fff'}} />
                <Bar dataKey="score" name="RICE Score" fill="#8884d8">
                  {tasks.map((entry, index) => <Cell key={`cell-${index}`} fill={index === 0 ? '#f4d35e' : '#1890ff'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Modal>

        <Modal title="About RICE+S Prioritization Model" open={isAboutOpen} onOk={() => setIsAboutOpen(false)} onCancel={() => setIsAboutOpen(false)} width={600}>
          <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#ccc' }}>
            <p><b>Backend:</b> Java Spring Boot (Port 8080)</p>
            <p><b>Frontend:</b> React + Ant Design (Port 5173)</p>
            <Divider style={{borderColor:'#444'}} />
            <h4 style={{ color: '#1890ff' }}>Formula</h4>
            <code style={{ background: '#333', padding: '4px 8px', borderRadius: '4px', display: 'block', marginTop: '5px', color:'#f4d35e' }}>(Reach × Impact × Confidence × Strategy) / Effort</code>
          </div>
        </Modal>
      </div>
    </>
  );
}