'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  HelpCircle, BookOpen, Shield, AlertTriangle, Info,
  Cloud, Server, Smartphone, Copy, Check, ExternalLink,
  Database, Terminal, Download, Loader2, Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

function CopyBlock({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied!');
  };
  return (
    <div className="relative group rounded-lg bg-muted/50 border p-3 my-2">
      {label && <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>}
      <pre className="text-xs overflow-x-auto whitespace-pre-wrap font-mono">{text}</pre>
      <Button
        size="sm" variant="ghost"
        className="absolute top-2 right-2 h-7 w-7 p-0 opacity-70 group-hover:opacity-100"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

function StepCard({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">{step}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-2">
        {children}
      </CardContent>
    </Card>
  );
}

export function HelpPage() {
  const [activeTab, setActiveTab] = useState('getting-started');
  const [downloading, setDownloading] = useState(false);

  const handleDownloadSource = async () => {
    setDownloading(true);
    try {
      const res = await fetch('/api/deploy');
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'omr-reader-source.zip';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Source code downloaded! See Deploy Guide for next steps.');
    } catch {
      toast.error('Failed to download source code');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <HelpCircle className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Help & Support</h1>
            <p className="text-sm text-muted-foreground">Guides, deployment, troubleshooting & FAQ</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full flex flex-wrap gap-1">
          <TabsTrigger value="getting-started" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Usage Guide</TabsTrigger>
          <TabsTrigger value="deploy" className="gap-1.5"><Cloud className="h-3.5 w-3.5" /> Deploy Guide</TabsTrigger>
          <TabsTrigger value="license" className="gap-1.5"><Shield className="h-3.5 w-3.5" /> License</TabsTrigger>
          <TabsTrigger value="faq" className="gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> FAQ</TabsTrigger>
          <TabsTrigger value="about" className="gap-1.5"><Info className="h-3.5 w-3.5" /> About</TabsTrigger>
        </TabsList>

        {/* ========== USAGE GUIDE ========== */}
        <TabsContent value="getting-started" className="space-y-4">
          <Card><CardHeader><CardTitle className="text-base">How to Use</CardTitle></CardHeader><CardContent className="text-sm space-y-3 text-muted-foreground">
            <ol className="list-decimal list-inside space-y-2">
              <li><strong>Create an Exam</strong> — Go to Create Exam, set the name, subject, total questions, marks, and passing percentage.</li>
              <li><strong>Upload Answer Key</strong> — Enter the correct answers for the exam.</li>
              <li><strong>Generate OMR Sheets</strong> — Use OMR Template page to generate and print answer sheets for students.</li>
              <li><strong>Upload OMR Sheets</strong> — Scan and upload filled OMR sheets from students.</li>
              <li><strong>Check Results</strong> — View evaluated scores, analytics, and merit lists.</li>
            </ol>
          </CardContent></Card>
        </TabsContent>

        {/* ========== DEPLOY GUIDE ========== */}
        <TabsContent value="deploy" className="space-y-4">

          {/* Important Note */}
          <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
            <CardContent className="py-3">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">⚠️ Backup ≠ Source Code</p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                App ke &quot;Backup&quot; button se jo file download hoti hai wo sirf <strong>exam data (JSON)</strong> hoti hai.
                Deploy karne ke liye <strong>pura Next.js project (source code)</strong> chahiye. Niche &quot;Download Source Code&quot; button se lo.
              </p>
            </CardContent>
          </Card>

          {/* DOWNLOAD SOURCE CODE BUTTON */}
          <Card className="border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Download className="h-4 w-4 text-emerald-600" />
                Step 0: Download Source Code (Pehle Ye Karein!)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Ye button se poora project ka source code download hoga (.zip file). Isme saari files hongi jo deploy ke liye chahiye.
              </p>
              <Button onClick={handleDownloadSource} disabled={downloading} className="w-full sm:w-auto">
                {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                {downloading ? 'Preparing...' : 'Download Source Code (.zip)'}
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                Download hoga: <code className="bg-muted px-1 rounded">omr-reader-source.zip</code> — isme <code className="bg-muted px-1 rounded">package.json, src/, prisma/, public/</code> sab hoga.
              </p>
            </CardContent>
          </Card>

          {/* Hosting Options */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Server className="h-4 w-4" /> Choose Your Hosting
            </h3>

            {/* --- Vercel Guide --- */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-sky-500" />
                  Option A: Vercel (FREE — Easiest)
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">

                <StepCard step={1} title="Turso DB Banao (Free Cloud Database — 5 min)">
                  <p className="text-xs">Vercel me local SQLite file nahi chalti (serverless hai). Isliye Turso use karein — ye cloud me SQLite chalata hai, <strong>free</strong> hai:</p>
                  <ol className="list-decimal list-inside space-y-1 mt-2 text-xs">
                    <li><a href="https://turso.tech" target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-1">turso.tech <ExternalLink className="h-3 w-3" /></a> pe jaayein → GitHub se Sign Up</li>
                    <li>Dashboard pe <strong>&quot;Create Database&quot;</strong> click karein</li>
                    <li>Name: <code className="bg-muted px-1 rounded">omr-reader</code> → Region: <strong>ap-south-1</strong> (Mumbai) → <strong>Create</strong></li>
                    <li>Database pe click karein → <strong>Settings</strong> tab</li>
                    <li><strong>URL</strong> copy karein (jaise: <code className="bg-muted px-1 rounded text-[10px]">libsql://omr-reader-abc.turso.io</code>)</li>
                    <li><strong>&quot;Create Auth Token&quot;</strong> click karein → token copy karein</li>
                  </ol>
                </StepCard>

                <StepCard step={2} title="GitHub me Source Code Upload karein">
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li><a href="https://github.com/new" target="_blank" rel="noreferrer" className="text-primary underline">github.com/new</a> pe jaayein</li>
                    <li>Repository name: <code className="bg-muted px-1 rounded">omr-reader</code></li>
                    <li><strong>&quot;Create repository&quot;</strong> click karein</li>
                    <li>Ab <strong>&quot;uploading an existing file&quot;</strong> link click karein</li>
                    <li>Downloaded <code className="bg-muted px-1 rounded">omr-reader-source.zip</code> extract karein</li>
                    <li>Saari files aur folders drag & drop karein</li>
                    <li><strong>&quot;Commit changes&quot;</strong> click karein ✅</li>
                  </ol>
                  <p className="text-xs mt-1 font-medium">Important: <code className="bg-muted px-1 rounded">src/</code>, <code className="bg-muted px-1 rounded">prisma/</code>, <code className="bg-muted px-1 rounded">public/</code>, <code className="bg-muted px-1 rounded">package.json</code> — ye saari files upload honi chahiye!</p>
                </StepCard>

                <StepCard step={3} title="Vercel me Deploy karein">
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li><a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-1">vercel.com <ExternalLink className="h-3 w-3" /></a> pe jaayein → <strong>GitHub</strong> se Sign Up</li>
                    <li>Dashboard pe <strong>&quot;Add New&quot; → &quot;Project&quot;</strong></li>
                    <li>Apna <code className="bg-muted px-1 rounded">omr-reader</code> repo dikhga → <strong>&quot;Import&quot;</strong></li>
                  </ol>
                  <p className="text-xs font-medium mt-2">Settings (Bohot Important):</p>
                  <CopyBlock
                    label="Build Command (exact copy karein):"
                    text="npx prisma generate && npx prisma db push && next build"
                  />
                  <CopyBlock
                    label="Start Command:"
                    text="next start"
                  />
                  <CopyBlock
                    label="Environment Variables (Settings → Env Vars me add karein):"
                    text={`DATABASE_URL=libsql://omr-reader-abc.turso.io\nTURSO_AUTH_TOKEN=eyJhbGciOiJIUzI1NiIs...your-token`}
                  />
                  <p className="text-xs text-amber-600 font-medium mt-2">⚠️ DATABASE_URL me apni Turso URL daalein aur TURSO_AUTH_TOKEN me apna token daalein!</p>
                  <p className="text-xs mt-2">Phir <strong>&quot;Deploy&quot;</strong> click karein → 2-3 minute me live! ✅</p>
                  <p className="text-xs text-muted-foreground mt-1">Vercel aapko URL dega: <code className="bg-muted px-1 rounded">https://omr-reader-xyz.vercel.app</code></p>
                </StepCard>
              </CardContent>
            </Card>

            {/* --- VPS Guide --- */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Server className="h-4 w-4 text-emerald-500" />
                  Option B: Hostinger VPS (Best — Full Control + SQLite Direct)
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">

                <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 p-3">
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    ✅ VPS me local SQLite direct chalti hai — Turso ki zarurat nahi! Simple hai.
                  </p>
                </div>

                <StepCard step={1} title="VPS me Software Install karein (One-time)">
                  <p className="text-xs">Hostinger panel → VPS → <strong>SSH Terminal</strong> open karein:</p>
                  <CopyBlock label="SSH Commands (ek-ek karke):" text={`sudo apt update && sudo apt upgrade -y\ncurl -fsSL https://bun.sh/install | bash\nsource ~/.bashrc\nsudo npm install -g pm2\nsudo apt install -y nginx certbot python3-certbot-nginx`} />
                </StepCard>

                <StepCard step={2} title="Source Code Upload karein">
                  <p className="text-xs">Downloaded <code className="bg-muted px-1 rounded">omr-reader-source.zip</code> ko VPS pe upload karein:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs mt-1">
                    <li>Hostinger <strong>File Manager</strong> ya <strong>SFTP</strong> use karein</li>
                    <li><code className="bg-muted px-1 rounded">/var/www/omr-reader/</code> me files upload karein</li>
                    <li>ZIP extract karein us folder me</li>
                  </ol>
                  <CopyBlock label="Phir SSH me:" text={`cd /var/www/omr-reader\nbun install\nbun run db:push\nnano .env`} />
                  <CopyBlock label=".env file me ye likhein (Ctrl+X → Y → Enter):" text={`DATABASE_URL="file:/var/www/omr-reader/db/custom.db"`} />
                </StepCard>

                <StepCard step={3} title="Build & Start karein">
                  <CopyBlock label="SSH Commands:" text={`cd /var/www/omr-reader\nbun run build\npm2 start bun --name "omr-reader" -- start\npm2 save\npm2 startup`} />
                </StepCard>

                <StepCard step={4} title="Nginx + SSL + Domain">
                  <CopyBlock label="Nginx config banao:" text={`sudo nano /etc/nginx/sites-available/omr-reader`} />
                  <CopyBlock label="Paste karein (your-domain.com replace karein):" text={`server {\n    listen 80;\n    server_name your-domain.com www.your-domain.com;\n    location / {\n        proxy_pass http://localhost:3000;\n        proxy_http_version 1.1;\n        proxy_set_header Upgrade $http_upgrade;\n        proxy_set_header Connection 'upgrade';\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n        proxy_cache_bypass $http_upgrade;\n        client_max_body_size 50M;\n    }\n}`} />
                  <CopyBlock label="Enable + SSL:" text={`sudo ln -s /etc/nginx/sites-available/omr-reader /etc/nginx/sites-enabled/\nsudo nginx -t\nsudo systemctl restart nginx\nsudo certbot --nginx -d your-domain.com -d www.your-domain.com`} />
                  <p className="text-xs mt-1">Hostinger DNS me: <code className="bg-muted px-1 rounded">A Record: @ → VPS_IP</code></p>
                </StepCard>
              </CardContent>
            </Card>

            {/* --- Mobile Install --- */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-violet-500" />
                  📱 Mobile Phone me Install karein
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p className="text-xs">Jab app live ho jaye (<code className="bg-muted px-1 rounded">https://...</code>), phone me install karein:</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="font-medium text-xs mb-1">📱 Android (Chrome)</p>
                    <ol className="text-xs space-y-1 list-decimal list-inside">
                      <li>URL khollein Chrome me</li>
                      <li>3-dot menu (⋮) tap karein</li>
                      <li>&quot;Install App&quot; ya &quot;Add to Home Screen&quot;</li>
                      <li>Install tap karein ✅</li>
                    </ol>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="font-medium text-xs mb-1">🍎 iPhone (Safari)</p>
                    <ol className="text-xs space-y-1 list-decimal list-inside">
                      <li>URL khollein Safari me</li>
                      <li>Share button (⬆️) tap karein</li>
                      <li>&quot;Add to Home Screen&quot;</li>
                      <li>Add tap karein ✅</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* --- Custom Domain on Vercel --- */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Globe className="h-4 w-4 text-orange-500" />
                  Hostinger Domain ko Vercel se Connect karein
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <ol className="list-decimal list-inside text-xs space-y-1">
                  <li>Vercel → Project → <strong>Settings</strong> → <strong>Domains</strong></li>
                  <li>Apni domain add karein (e.g., <code className="bg-muted px-1 rounded">omr.yourdomain.com</code>)</li>
                  <li>Vercel 2 records bataega — Hostinger DNS me add karein:</li>
                </ol>
                <CopyBlock label="Hostinger DNS me add karein:" text={`Type: CNAME     Name: omr     Value: cname.vercel-dns.com\n\nType: A        Name: @       Value: 76.76.21.21 (Vercel IP)`} />
                <p className="text-xs">10-30 min me connect ho jayega + auto SSL ✅</p>
              </CardContent>
            </Card>

            {/* --- Future Updates --- */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  Future me Update kaise karein?
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="font-medium text-xs mb-1">Vercel (Auto!):</p>
                    <p className="text-xs">GitHub pe code push karein → Vercel <strong>khud deploy</strong> kar dega!</p>
                  </div>
                  <div>
                    <p className="font-medium text-xs mb-1">VPS:</p>
                    <CopyBlock label="SSH Commands:" text={`cd /var/www/omr-reader\ngit pull origin main\nbun install\nbun run build\npm2 restart omr-reader`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ========== LICENSE ========== */}
        <TabsContent value="license" className="space-y-4">
          <Card><CardHeader><CardTitle className="text-base">License Activation</CardTitle></CardHeader><CardContent className="text-sm space-y-3 text-muted-foreground">
            <p>To activate your license:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Obtain a license key from your administrator.</li>
              <li>Enter the license key on the activation screen.</li>
              <li>Once activated, the app is ready to use.</li>
            </ol>
            <p className="text-xs">License keys are validated securely. Your key is never stored on your device.</p>
          </CardContent></Card>
        </TabsContent>

        {/* ========== FAQ ========== */}
        <TabsContent value="faq" className="space-y-4">
          <Card><CardHeader><CardTitle className="text-base">Frequently Asked Questions</CardTitle></CardHeader><CardContent className="text-sm space-y-4">
            <div><h4 className="font-medium text-sm">How many questions can an OMR sheet hold?</h4><p className="text-muted-foreground mt-1">Up to 250 questions on a single A4 page with 4 options each.</p></div>
            <div><h4 className="font-medium text-sm">What file formats are supported?</h4><p className="text-muted-foreground mt-1">JPEG, PNG images and PDF files for OMR sheet scanning.</p></div>
            <div><h4 className="font-medium text-sm">Can I customize the OMR sheet?</h4><p className="text-muted-foreground mt-1">Yes — institution name, logo, exam name, question count, roll number digits, and more.</p></div>
            <div><h4 className="font-medium text-sm">Kya Blogger pe host ho sakta hai?</h4><p className="text-muted-foreground mt-1">Nahi — Blogger sirf static HTML blogs ke liye hai. Ye app ke liye Node.js hosting chahiye (VPS ya Vercel).</p></div>
            <div><h4 className="font-medium text-sm">Backup me source code milta hai?</h4><p className="text-muted-foreground mt-1">Nahi — Backup me sirf exam data/OMR results milte hain. Source code &quot;Download Source Code&quot; button se milta hai (Help → Deploy Guide).</p></div>
            <div><h4 className="font-medium text-sm">Vercel free me kya limitations hain?</h4><p className="text-muted-foreground mt-1">Vercel free plan me local SQLite nahi chalti, isliye Turso (free cloud SQLite) use karna padta hai. Baaki sab free hai — unlimited bandwidth, auto SSL, auto deploy.</p></div>
          </CardContent></Card>
        </TabsContent>

        {/* ========== ABOUT ========== */}
        <TabsContent value="about" className="space-y-4">
          <Card><CardHeader><CardTitle className="text-base">About</CardTitle></CardHeader><CardContent className="text-sm space-y-2 text-muted-foreground">
            <p>OMR Sheet Reader — Professional OMR evaluation software for educational institutions.</p>
            <p className="text-xs">Version 1.0.0</p>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}