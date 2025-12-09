import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, InputNumber, Select, Slider, Table, Modal, Card, Row, Col, Tag, message, Space, Divider, List, Progress, Form } from 'antd';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { InfoCircleOutlined, BarChartOutlined, FireOutlined, PlusOutlined, CloudServerOutlined, ThunderboltOutlined, DeleteOutlined, UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';

const { Option } = Select;

export default function App() {
  // --- 1. User System State ---
  const [currentUser, setCurrentUser] = useState(null); 
  const [authMode, setAuthMode] = useState('login'); 

  // --- 2. Core Business Data State ---
  const [tasks, setTasks] = useState([]); 
  const [inputs, setInputs] = useState({
    name: 'New Feature', reach: 1000, impact: 2.0, confidence: 80, strategy: 1.0, effort: 10,
  });
  const [sprintCapacity, setSprintCapacity] = useState(40); 
  const [loading, setLoading] = useState(false);
  const [isChartOpen, setIsChartOpen] = useState(false); 
  const [isAboutOpen, setIsAboutOpen] = useState(false); 

  // --- 3. Authentication Logic ---
  const handleAuth = async (values) => {
    const endpoint = authMode === 'login' ? '/api/login' : '/api/register';
    try {
      const res = await fetch(`http://localhost:8080${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      
      if (data.success) {
        if (authMode === 'register') {
          message.success('注册成功，请登录！');
          setAuthMode('login');
        } else {
          message.success(`欢迎回来, ${data.username}!`);
          setCurrentUser(data.username); 
          loadUserTasks(data.username); 
        }
      } else {
        message.error(data.message || '操作失败');
      }
    } catch (err) {
      message.error("无法连接到服务器");
    }
  };

  const loadUserTasks = async (username) => {
    try {
      const res = await fetch(`http://localhost:8080/api/tasks?username=${username}`);
      const data = await res.json();
      setTasks(data.sort((a, b) => b.score - a.score));
    } catch (e) { console.error(e); }
  };

  // --- 4. Business Functions ---
  const handleChange = (key, value) => setInputs({ ...inputs, [key]: value });

  const handleAdd = () => {
    if (inputs.effort <= 0) { message.error("Effort must be > 0"); return; }
    const newTask = { id: Date.now(), ...inputs, score: 0 };
    setTasks([...tasks, newTask]);
    message.success("Task Added (Pending Analyze)");
  };

  const handleAnalyze = async () => {
    if (tasks.length === 0) { message.warning("List is empty!"); return; }
    if (!currentUser) { message.warning("Please login first!"); return; }

    setLoading(true);
    const hideLoading = message.loading("Connecting to Java Backend...", 0);
    try {
      const updatedTasks = await Promise.all(tasks.map(async (t) => {
        const response = await fetch('http://localhost:8080/api/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
              id: t.id, // 传ID给后端，防止重复添加
              name: t.name, reach: t.reach, impact: t.impact, confidence: t.confidence, strategy: t.strategy, effort: t.effort,
              username: currentUser 
          })
        });
        if (!response.ok) throw new Error("Backend failed");
        return await response.json(); 
      }));

      updatedTasks.sort((a, b) => b.score - a.score);
      setTasks(updatedTasks);
      hideLoading();
      message.success("Success! Synced with MySQL.");
    } catch (error) {
      hideLoading();
      console.error(error);
      message.error("Failed to connect to Backend!");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setTasks(tasks.filter(t => t.id !== id)); 
    try { await fetch(`http://localhost:8080/api/delete/${id}`, { method: 'DELETE' }); } catch(e){}
  };

  const handleAutoPlan = () => {
    if (tasks.length === 0 || tasks[0].score === 0) { message.warning("Please Analyze & Sort first!"); return; }
    const capacityLimit = sprintCapacity || 0; 
    let currentEffort = 0;
    const selectedTasks = [];
    for (const task of tasks) {
      if (currentEffort + task.effort <= capacityLimit) {
        selectedTasks.push(task);
        currentEffort += task.effort;
      }
    }
    // 弹窗使用默认样式（白底黑字），无需额外 class
    Modal.info({
      title: 'Sprint Auto-Plan Result',
      width: 600,
      icon: <ThunderboltOutlined style={{ color: '#f4d35e' }} />, 
      content: (
        <div>
          <p>Based on capacity: <b>{capacityLimit} Person-Days</b></p>
          <Progress percent={capacityLimit > 0 ? Math.round((currentEffort / capacityLimit) * 100) : 0} status="active" strokeColor="#f4d35e" />
          <p style={{ marginTop: 20, marginBottom:10 }}>Selected <b>{selectedTasks.length}</b> top priority tasks:</p>
          <List size="small" bordered dataSource={selectedTasks} 
            renderItem={(item, index) => (
              <List.Item>
                <Tag color="gold" style={{fontWeight:'bold'}}>#{index + 1}</Tag> 
                <span><b>{item.name}</b> (Score: {item.score.toFixed(1)})</span>
              </List.Item>
            )}
          />
        </div>
      ),
    });
  };

  // --- 5. Animation Engine ---
  const canvasRef = useRef(null);
  const requestRef = useRef();
  const speedRef = useRef(0.5);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let width = window.innerWidth; let height = window.innerHeight;
    canvas.width = width; canvas.height = height;
    const stars = Array.from({ length: 800 }).map(() => ({ x: Math.random() * width - width / 2, y: Math.random() * height - height / 2, z: Math.random() * width }));
    const render = () => {
      ctx.fillStyle = '#050810'; ctx.fillRect(0, 0, width, height);
      const cx = width / 2; const cy = height / 2;
      stars.forEach(star => {
        star.z -= speedRef.current;
        if (star.z <= 0) { star.z = width; star.x = Math.random() * width - width / 2; star.y = Math.random() * height - height / 2; }
        const scale = width / star.z;
        const x2d = cx + star.x * scale; const y2d = cy + star.y * scale;
        if (x2d >= 0 && x2d <= width && y2d >= 0 && y2d <= height) {
          if (speedRef.current > 10) { ctx.fillStyle = '#fff'; ctx.fillRect(x2d, y2d, (1 - star.z / width) * 3, (1 - star.z / width) * 60); } 
          else { ctx.fillStyle = `rgba(255, 255, 255, ${(1 - star.z / width)})`; ctx.beginPath(); ctx.arc(x2d, y2d, (1 - star.z / width) * 3, 0, Math.PI * 2); ctx.fill(); }
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
  };

  // --- 6. Styles & Render ---
  const rawColumns = [
    { title: 'Task Name', dataIndex: 'name', width: 200, render: t => <span style={{color:'#fff'}}>{t}</span> },
    { title: 'Reach', dataIndex: 'reach', width: 80 },
    { title: 'Impact', dataIndex: 'impact', width: 80 },
    { title: 'Confidence', dataIndex: 'confidence', width: 100, render: v => v + '%' },
    { title: 'Strategy', dataIndex: 'strategy', width: 100, render: v => 'x' + v },
    { title: 'Effort', dataIndex: 'effort', width: 100 },
    { title: 'Action', width: 80, render: (_, r) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r.id)} /> },
  ];
  const sortedColumns = [
    { title: 'Rank', width: 80, render: (t, r, i) => <Tag color={i === 0 ? "gold" : "cyan"} style={{color:'#000', fontWeight:'bold'}}>#{i + 1}</Tag> },
    { title: 'RICE Score', dataIndex: 'score', width: 120, sorter: (a, b) => a.score - b.score, render: v => <b style={{ color: '#f4d35e', fontSize: 16 }}>{v.toFixed(1)}</b> },
    { title: 'Task Name', dataIndex: 'name', render: t => <span style={{color:'#fff'}}>{t}</span> },
    { title: 'Effort Cost', dataIndex: 'effort', width: 120, render: v => <Tag style={{color:'#000'}}>{v} Days</Tag> },
  ];

  // 🔥🔥🔥 核心修复区域：高对比度样式 🔥🔥🔥
  const styles = `
    html, body, #root { margin:0; width:100%; height:100%; overflow:hidden; background:#000; font-family:'Segoe UI', sans-serif; }
    
    /* 布局与动画 */
    .star-canvas { position: fixed; top: 0; left: 0; z-index: 0; }
    .ui-layer { position: fixed; inset: 0; z-index: 10; pointer-events: none; }
    .intro-screen, .auth-container { pointer-events: auto; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }
    .auth-container { width: 360px; padding: 40px; background: rgba(30, 30, 30, 0.9); backdrop-filter: blur(20px); border: 1px solid #555; border-radius: 16px; }
    .main-screen { pointer-events: auto; width: 100%; height: 100%; overflow-y: auto; padding: 20px; animation: fadeIn 1.5s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
    
    /* --- 1. 输入框统一修复 (白底黑字) --- */
    .ant-input, 
    .ant-input-password,
    .ant-input-affix-wrapper, 
    .ant-input-number, 
    .ant-select-selector { 
        background-color: #fff !important; /* 强制白底 */
        border-color: #d9d9d9 !important; 
        color: #000 !important; /* 强制黑字 */
    }
    .ant-input-prefix, .ant-input-suffix { color: #888 !important; }
    .ant-input-number-input { color: #000 !important; } 
    .ant-input-group-addon { background-color: #f5f5f5 !important; color: #000 !important; border-color: #d9d9d9 !important; }

    /* --- 2. 弹窗 (Modal) 统一修复 (白底黑字) --- */
    /* 强制恢复 Ant Design 默认的白底样式，解决所有看不清的问题 */
    .ant-modal-content, .ant-modal-header {
        background-color: #fff !important; 
    }
    .ant-modal-title { color: #000 !important; }
    .ant-modal-close { color: #000 !important; }
    .ant-modal-body { color: #000 !important; }
    
    /* 弹窗里的文字强制变黑 */
    .ant-modal p, .ant-modal b, .ant-modal h4, .ant-modal span, .ant-modal div { 
        color: #000; 
    }
    /* 解决 AutoPlan 列表边框颜色 */
    .ant-list-bordered { border-color: #d9d9d9 !important; }
    .ant-list-item { border-bottom: 1px solid #f0f0f0 !important; color: #000 !important; }

    /* --- 3. 左上角用户名 (清晰可见) --- */
    .user-tag {
        font-size: 16px !important;
        font-weight: bold !important;
        color: #fff !important;
        text-shadow: 0 0 5px rgba(0,0,0,0.8);
    }

    /* --- 4. 表格 & 卡片样式 (保持暗色，因为背景是星空) --- */
    .glass-card { background: rgba(20, 30, 50, 0.75) !important; backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.15) !important; border-radius: 12px !important; }
    .ant-card-head, .ant-card-head-title, .ant-card-body { color: #fff !important; }
    .ant-table, .ant-table-container { background: transparent !important; color: #fff !important; }
    .ant-table-thead > tr > th { background: rgba(255,255,255,0.1) !important; color: #8cbceb !important; border: none !important; }
    .ant-table-tbody > tr > td { border-bottom: 1px solid rgba(255,255,255,0.05) !important; color: #fff !important; }
    .ant-table-tbody > tr:hover > td { background: rgba(255,255,255,0.1) !important; }
    .ant-table-placeholder { background: rgba(255,255,255,0.05) !important; }
    .ant-empty-description { color: #888 !important; }
    
    /* Tag 标签修复 */
    .ant-tag { color: #000 !important; font-weight: bold; border: none; }
    
    /* 提示框 */
    .ant-message-notice-content { background: #fff !important; color: #000 !important; }
    
    /* 全局文字兜底 (仅针对主界面) */
    /* 注意：这里加了 .main-screen 前缀，防止误伤 Modal 里的字 */
    .main-screen span:not(.ant-tag):not(.ant-input-prefix):not(.ant-input-suffix):not(.ant-modal span) { color: #fff; } 
  `;

  return (
    <>
      <style>{styles}</style>
      <canvas ref={canvasRef} className="star-canvas" />

      <div className="ui-layer">
        {!currentUser ? (
          // --- 登录/注册 界面 ---
          <div className="auth-container">
             <h1 style={{fontSize:'3rem', color:'#fff', margin:0, textShadow:'0 0 30px #fff'}}>RICE+S</h1>
             <p style={{color:'#8cbceb', marginBottom:30}}>MYSQL EDITION</p>
             <Form onFinish={handleAuth}>
                <Form.Item name="username" rules={[{ required: true, message: 'Please input username' }]}>
                  <Input prefix={<UserOutlined />} placeholder="Username" size="large" />
                </Form.Item>
                <Form.Item name="password" rules={[{ required: true, message: 'Please input password' }]}>
                  <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" size="large" block style={{background: '#722ed1', borderColor:'#722ed1'}}>
                    {authMode === 'login' ? 'LOGIN' : 'REGISTER'}
                  </Button>
                </Form.Item>
             </Form>
             <Button type="link" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
                {authMode === 'login' ? 'Need account? Register' : 'Have account? Login'}
             </Button>
          </div>
        ) : (
          // --- 主界面 ---
          <div className="main-screen">
             {/* 顶部欢迎栏 - 修复：字体加粗变大，白色，清晰可见 */}
             <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
                <Space>
                   <UserOutlined style={{color:'#f4d35e', fontSize:'20px'}} />
                   <span className="user-tag">Welcome, {currentUser}</span>
                </Space>
                <Button type="text" danger size="small" icon={<LoginOutlined />} onClick={() => setCurrentUser(null)}>Logout</Button>
             </div>

            <Card className="glass-card" bordered={false} style={{ marginBottom: 20 }}>
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
                  <span style={{ marginLeft: 8, color:'#fff' }}>{inputs.confidence}%</span>
                </div>
                <InputNumber addonBefore="Strategy" step={0.5} value={inputs.strategy} onChange={v => handleChange('strategy', v)} style={{ width: 130 }} />
                <InputNumber addonBefore="Effort" value={inputs.effort} onChange={v => handleChange('effort', v)} style={{ width: 130 }} />
              </Space>

              <Divider dashed style={{borderColor:'rgba(255,255,255,0.1)'}} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <Space>
                  <Button icon={<PlusOutlined />} onClick={handleAdd} size="large" style={{background:'rgba(255,255,255,0.1)', color:'#fff', border:'none'}}>Add to List</Button>
                  <Button type="primary" danger icon={<FireOutlined />} onClick={handleAnalyze} loading={loading} size="large">Analyze & Save</Button>
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

        {/* --- Modals --- */}
        <Modal 
          title="RICE Score Visualization" 
          open={isChartOpen} 
          onCancel={() => setIsChartOpen(false)} 
          footer={null} 
          width={800} 
        >
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tasks} layout="vertical" margin={{ left: 20, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                <XAxis type="number" stroke="#333" tick={{fill: '#333'}} />
                <YAxis dataKey="name" type="category" width={120} stroke="#333" tick={{fill: '#333'}} />
                <Tooltip contentStyle={{background:'#fff', border:'1px solid #ccc'}} itemStyle={{color:'#000'}} />
                <Bar dataKey="score" name="RICE Score" radius={[0, 4, 4, 0]}>
                   {tasks.map((entry, index) => <Cell key={`cell-${index}`} fill={index === 0 ? '#f4d35e' : '#1890ff'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Modal>

        <Modal 
          title="About" 
          open={isAboutOpen} 
          onOk={() => setIsAboutOpen(false)} 
          onCancel={() => setIsAboutOpen(false)} 
          width={600} 
          cancelButtonProps={{ style: { display: 'none' } }} 
        >
           <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
            <p><b>Backend:</b> Java Spring Boot (Port 8080)</p>
            <p><b>Frontend:</b> React + Ant Design (Port 5173)</p>
            <Divider />
            <h4 style={{ color: '#1890ff' }}>Formula</h4>
            <code style={{ background: '#f5f5f5', padding: '4px 8px', borderRadius: '4px', display: 'block', marginTop: '5px', color:'#d4380d', border:'1px solid #d9d9d9' }}>(Reach × Impact × Confidence × Strategy) / Effort</code>
          </div>
        </Modal>
      </div>
    </>
  );
}
