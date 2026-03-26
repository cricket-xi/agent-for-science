/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { 
  Sparkles, BrainCircuit, AlertTriangle, CheckCircle2, Loader2, 
  BookOpen, Settings2, FileText, Github, Cpu, Clock, Target, Database
} from 'lucide-react';
import { cn } from './lib/utils';

// --- Interfaces ---
interface Paper {
  title: string;
  source: string;
  methodSummary: string;
  openSourceStatus: string;
  link: string;
}

interface TopicScore {
  innovation: number;
  computeMatch: number;
  dataDifficulty: number;
}

interface Topic {
  directionName: string;
  innovationPoints: string[];
  implementationPath: string;
  scores: TopicScore;
  riskWarning: string;
}

interface ReportData {
  papers: Paper[];
  topics: Topic[];
}

// --- Constants ---
const DOMAINS = ['NLP', 'CV', 'Multi-Agent', 'System', 'Data Mining', 'Other'];
const TIME_LIMITS = [
  '近2年，限 CCF A/B 类及高引 arXiv',
  '近3年，限 CCF A/B/C 类',
  '近5年，不限来源',
  '仅限最新 arXiv 预印本'
];

export default function App() {
  // Form State
  const [domain, setDomain] = useState(DOMAINS[0]);
  const [initialIdea, setInitialIdea] = useState('');
  const [hardwareConstraints, setHardwareConstraints] = useState('');
  const [timeLimit, setTimeLimit] = useState(TIME_LIMITS[0]);
  
  // App State
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!initialIdea) {
      setError('请输入初步想法');
      return;
    }

    setLoading(true);
    setError('');
    setReportData(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `
# Role: 极度务实、反感学术幻觉的资深 CS 导师。
# Context: 
- 研究领域: ${domain}
- 用户想法: ${initialIdea}
- 算力约束: ${hardwareConstraints || '无特殊限制'}
- 文献限制: ${timeLimit}

# Task:
1. 推荐 3-5 篇最相关的核心文献 (Baseline)。
2. 交叉碰撞生成 3 个差异化研究方向。

# ⚠️ 绝对红线 (Constraints):
1. 绝对禁止推荐超出算力约束 (${hardwareConstraints || '无限制'}) 的方案（如要求单卡 24G 却推荐从头预训练）。
2. 方案必须可通过轻量微调（LoRA）、Prompt工程或无训练方法落地。

# Output: 严格按 JSON 格式输出，包含核心文献清单和候选选题方向。
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              papers: {
                type: Type.ARRAY,
                description: "核心文献清单 (High-Signal Baseline)",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: "论文标题" },
                    source: { type: Type.STRING, description: "来源/年份（标明 CCF 级别）" },
                    methodSummary: { type: Type.STRING, description: "核心方法提炼" },
                    openSourceStatus: { type: Type.STRING, description: "开源情况 (如: 已开源, 未开源)" },
                    link: { type: Type.STRING, description: "PapersWithCode 或 GitHub 链接" }
                  },
                  required: ["title", "source", "methodSummary", "openSourceStatus", "link"]
                }
              },
              topics: {
                type: Type.ARRAY,
                description: "候选选题方向 (Candidate Directions)",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    directionName: { type: Type.STRING, description: "方向名称" },
                    innovationPoints: { 
                      type: Type.ARRAY, 
                      items: { type: Type.STRING },
                      description: "创新点阐述（说明补足了哪些现有文献的空白）"
                    },
                    implementationPath: { type: Type.STRING, description: "具体实现路径（强调在受限算力下的实现方案，如使用 LoRA）" },
                    scores: {
                      type: Type.OBJECT,
                      description: "可行性评分雷达表 (5分制)",
                      properties: {
                        innovation: { type: Type.NUMBER, description: "创新度 (1-5分)" },
                        computeMatch: { type: Type.NUMBER, description: "算力匹配度 (1-5分)" },
                        dataDifficulty: { type: Type.NUMBER, description: "数据获取难度 (1-5分，分数越高代表获取越容易/越好)" }
                      },
                      required: ["innovation", "computeMatch", "dataDifficulty"]
                    },
                    riskWarning: { type: Type.STRING, description: "高亮风险提示 (强制生成的学术与工程风险预警)" }
                  },
                  required: ["directionName", "innovationPoints", "implementationPath", "scores", "riskWarning"]
                }
              }
            },
            required: ["papers", "topics"]
          }
        }
      });

      const resultText = response.text;
      if (resultText) {
        const data = JSON.parse(resultText);
        setReportData(data);
      } else {
        setError('生成失败，请重试。');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || '调用大模型时发生错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-600">
            <BrainCircuit className="w-6 h-6" />
            <h1 className="text-xl font-bold tracking-tight">科研选题副驾 <span className="text-slate-400 font-normal text-sm ml-2 hidden sm:inline-block">Research Topic Copilot v1.0</span></h1>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
            CS 领域研究生专属
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sidebar - Input Form */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-24">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
              <Settings2 className="w-5 h-5 text-indigo-500" />
              开题条件配置
            </h2>
            
            <div className="space-y-5">
              {/* Domain */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-slate-400" />
                  研究领域 <span className="text-red-500">*</span>
                </label>
                <select 
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                >
                  {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* Initial Idea */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-slate-400" />
                  初步想法 <span className="text-red-500">*</span>
                </label>
                <textarea 
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none h-24 text-sm"
                  placeholder="例：想研究多个 AI 智能体怎么合作写代码..."
                  value={initialIdea}
                  onChange={(e) => setInitialIdea(e.target.value)}
                />
              </div>

              {/* Hardware Constraints */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-slate-400" />
                  硬件与算力约束
                </label>
                <textarea 
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none h-20 text-sm"
                  placeholder="例：实验室仅有单张 RTX 3090 24G 显卡"
                  value={hardwareConstraints}
                  onChange={(e) => setHardwareConstraints(e.target.value)}
                />
              </div>

              {/* Time Limit */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-400" />
                  时间与来源限制
                </label>
                <select 
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                >
                  {TIME_LIMITS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-start gap-2 border border-red-100">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm hover:shadow active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    正在深度推演...
                  </>
                ) : (
                  <>
                    <BrainCircuit className="w-5 h-5" />
                    生成选题分析报告
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Content - Results */}
        <div className="lg:col-span-8">
          {!reportData && !loading && (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                <BrainCircuit className="w-10 h-10 text-indigo-300" />
              </div>
              <p className="text-lg font-medium text-slate-600">等待生成《选题分析报告》</p>
              <p className="text-sm mt-2 max-w-sm text-center">在左侧输入您的研究领域、初步想法和客观约束条件，AI 将为您检索核心文献并推导可行方向。</p>
            </div>
          )}

          {loading && (
            <div className="space-y-8">
              {/* Skeleton for Papers */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-1/4 mb-6"></div>
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-slate-50 rounded-xl border border-slate-100"></div>
                  ))}
                </div>
              </div>
              {/* Skeleton for Topics */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-1/3 mb-6"></div>
                <div className="h-64 bg-slate-50 rounded-xl border border-slate-100"></div>
              </div>
            </div>
          )}

          {!loading && reportData && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Section 1: High-Signal Baseline */}
              <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-400" />
                    核心文献清单 (High-Signal Baseline)
                  </h2>
                  <span className="text-xs font-medium bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full border border-slate-700">
                    {reportData.papers.length} 篇精读文献
                  </span>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {reportData.papers.map((paper, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/50 transition-colors">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <h3 className="font-bold text-slate-900 text-base leading-tight">{paper.title}</h3>
                          <span className="shrink-0 text-xs font-semibold bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                            {paper.source}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mb-3 leading-relaxed">
                          <span className="font-semibold text-slate-700">核心方法：</span>{paper.methodSummary}
                        </p>
                        <div className="flex items-center gap-4 text-xs font-medium">
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Database className="w-3.5 h-3.5" />
                            {paper.openSourceStatus}
                          </div>
                          {paper.link && paper.link !== '无' && (
                            <a href={paper.link} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 hover:underline">
                              <Github className="w-3.5 h-3.5" />
                              代码/项目链接
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Section 2: Candidate Directions */}
              <section className="space-y-6">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 px-1">
                  <Target className="w-6 h-6 text-indigo-600" />
                  候选选题方向 (Candidate Directions)
                </h2>
                
                {reportData.topics.map((topic, index) => (
                  <div key={index} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md">
                    <div className="bg-indigo-50/50 px-6 py-5 border-b border-slate-100">
                      <div className="flex items-center gap-2 text-indigo-600 text-sm font-bold tracking-wider uppercase mb-1.5">
                        <span>Direction {index + 1}</span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 leading-tight">{topic.directionName}</h3>
                    </div>
                    
                    <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-8">
                      {/* Left Column: Details */}
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            创新点阐述 (Gap Filling)
                          </h4>
                          <ul className="space-y-2.5">
                            {topic.innovationPoints.map((point, idx) => (
                              <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-600">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                <span className="leading-relaxed">{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-blue-500" />
                            具体实现路径 (Implementation)
                          </h4>
                          <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                            {topic.implementationPath}
                          </p>
                        </div>
                      </div>

                      {/* Right Column: Scoring & Risks */}
                      <div className="space-y-6 xl:border-l xl:border-slate-100 xl:pl-8">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 mb-2 text-center">
                            可行性评分雷达表 (Feasibility Radar)
                          </h4>
                          <div className="h-52 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart cx="50%" cy="50%" outerRadius="65%" data={[
                                { subject: '创新度', A: topic.scores.innovation, fullMark: 5 },
                                { subject: '算力匹配度', A: topic.scores.computeMatch, fullMark: 5 },
                                { subject: '数据获取难度', A: topic.scores.dataDifficulty, fullMark: 5 },
                              ]}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 12, fontWeight: 500 }} />
                                <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickCount={6} />
                                <Radar name="Score" dataKey="A" stroke="#4f46e5" strokeWidth={2} fill="#6366f1" fillOpacity={0.35} />
                              </RadarChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex justify-center gap-4 text-xs text-slate-500 mt-2">
                            <span>满分: 5分</span>
                            <span>(数据获取难度分数越高代表越容易)</span>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-500" />
                            高亮风险提示 (Risk Warnings)
                          </h4>
                          <div className="bg-rose-50 border border-rose-100 text-rose-700 text-sm p-3.5 rounded-xl leading-relaxed font-medium">
                            {topic.riskWarning}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

