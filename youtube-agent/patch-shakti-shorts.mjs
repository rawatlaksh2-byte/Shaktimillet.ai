import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.argv[2] || 'agenttube');

async function read(rel) {
  return fs.readFile(path.join(root, rel), 'utf8');
}

async function write(rel, content) {
  await fs.writeFile(path.join(root, rel), content);
}

function replaceOnce(content, needle, replacement, label) {
  const count = content.split(needle).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: expected exactly one match, found ${count}`);
  }
  return content.replace(needle, replacement);
}

async function patchScriptWriter() {
  const rel = 'agents/script-writer-agent.js';
  let src = await read(rel);

  src = replaceOnce(
    src,
    "      const template = this.templates[strategy.contentType.toLowerCase()] || this.templates.explainer;\n      const aiScript = await this.generateScriptWithAI(strategy, template);",
    `      const template = this.templates[strategy.contentType.toLowerCase()] || this.templates.explainer;
      if (this.isShaktiShort(strategy)) {
        const shortScript = await this.generateShaktiShortWithAI(strategy, template);
        shortScript.fullScript = this.formatFullScript(shortScript);
        await this.db.saveScript(shortScript);
        this.logger.info(\`Shakti 60-second script generated: \${shortScript.title}\`);
        return shortScript;
      }
      const aiScript = await this.generateScriptWithAI(strategy, template);`,
    'script writer entry'
  );

  src = replaceOnce(
    src,
    "  async generateScriptWithAI(strategy, template) {",
    `  isShaktiShort(strategy) {
    return process.env.SHAKTI_SHORTS_MODE === 'true' && strategy?.requestedLengthKey === 'short';
  }

  async generateShaktiShortWithAI(strategy, template) {
    if (!this.aiTextService.isAvailable()) {
      throw new Error('Shakti Shorts mode requires a live AI text provider so the 6-scene script can fail closed instead of falling back to generic long-form copy');
    }

    const prompt = \`You are writing a Shakti Millets vertical YouTube Short.
Return ONLY valid JSON with this exact shape:
{
  "title": "title under 70 characters",
  "scenes": [
    {"label":"Hook","text":"spoken line"},
    {"label":"Context","text":"spoken line"},
    {"label":"Point 1","text":"spoken line"},
    {"label":"Point 2","text":"spoken line"},
    {"label":"Takeaway","text":"spoken line"},
    {"label":"CTA","text":"spoken line"}
  ],
  "claims": [
    {"text":"externally verifiable factual claim","riskLevel":"standard|high","sourceUrls":["exact supplied source URL"]}
  ]
}

Topic: \${strategy.topic}
Angle: \${strategy.angle}
Audience: \${strategy.targetAudience}
Content type: \${strategy.contentType}
Brand voice: \${strategy.brandVoice || 'simple Hindi/Hinglish, trustworthy and practical'}
Channel goal: \${strategy.channelGoal || 'teach practical millet knowledge'}
Value proposition: \${strategy.channelValueProposition || 'simple practical millet education'}
Constraints: \${strategy.channelConstraints || 'Do not invent facts or health claims.'}
Research sources: \${JSON.stringify(strategy.researchSources || [])}

Hard rules:
- EXACTLY 6 scenes, in the exact order shown above.
- Each scene is designed for 10 seconds.
- Keep each spoken scene concise; target 12-20 words.
- Total spoken copy should normally stay around 85-110 words.
- Natural Hindi/Hinglish for an Indian audience. Keep Shakti Millets and millet names clear.
- First scene must hook immediately; no greeting or long intro.
- Scene 6 is one short CTA only.
- No cure, diabetes-control, guaranteed weight-loss or disease-treatment claims.
- Do not invent nutrition figures, prices, discounts, stock, certifications, sourcing facts or delivery promises.
- Do not claim personal expertise or fake research experience.
- List every externally verifiable factual claim in claims.
- Claims may cite only exact URLs present in Research sources. If unsupported, use an empty sourceUrls array so review remains blocking.
- Avoid hype such as shocking, miracle, secret, game changer, guaranteed.
\`;

    const response = await this.aiTextService.generateText(prompt, {
      maxTokens: 1400,
      temperature: 0.5
    });
    const parsed = this.parseAIJsonResponse(response);
    if (!Array.isArray(parsed.scenes) || parsed.scenes.length !== 6) {
      throw new Error('Shakti Shorts script must contain exactly 6 scenes');
    }

    const scenes = parsed.scenes.map((scene, index) => ({
      label: String(scene?.label || \`Scene \${index + 1}\`).trim().slice(0, 80),
      text: String(scene?.text || '').trim()
    }));
    if (scenes.some(scene => !scene.text)) {
      throw new Error('Shakti Shorts script contains an empty scene');
    }

    const allowedSources = strategy.researchSources || [];
    return {
      title: String(parsed.title || strategy.topic).trim().slice(0, 70),
      hook: { type: 'shakti_short', text: scenes[0].text, duration: '0:00-0:10' },
      introduction: {
        greeting: '',
        topicIntro: scenes[1].text,
        valueProposition: '',
        credibility: '',
        duration: '0:10-0:20'
      },
      mainContent: {
        sections: [
          { type: 'shakti_short', title: scenes[2].label, content: [scenes[2].text], duration: 10 },
          { type: 'shakti_short', title: scenes[3].label, content: [scenes[3].text], duration: 10 }
        ],
        totalDuration: 20
      },
      conclusion: {
        type: 'conclusion',
        title: scenes[4].label,
        recap: [scenes[4].text],
        finalThought: '',
        duration: '10 seconds'
      },
      callToAction: {
        type: 'call_to_action',
        subscribe: scenes[5].text,
        like: '',
        comment: '',
        nextVideo: '',
        duration: '10 seconds'
      },
      duration: '1:00',
      tone: template.tone,
      pacing: 'quick',
      keywords: strategy.keywords || [],
      claims: this.normalizeAIClaims(parsed.claims, allowedSources),
      metadata: {
        strategy,
        generatedAt: new Date().toISOString(),
        version: 'shakti-short-v1',
        generationSource: 'ai',
        shaktiShort: true,
        sceneCount: 6,
        sceneDurationSeconds: 10,
        targetDurationSeconds: 60
      }
    };
  }

  async generateScriptWithAI(strategy, template) {`,
    'insert Shakti short generator'
  );

  await write(rel, src);
}

async function patchIndex() {
  const rel = 'index.js';
  let src = await read(rel);
  src = replaceOnce(
    src,
    "    const lengthLabels = { short: '2-4 minutes', medium: '8-12 minutes', long: '15-20 minutes' };",
    "    const shaktiShortMode = process.env.SHAKTI_SHORTS_MODE === 'true' && length === 'short';\n    const lengthLabels = { short: shaktiShortMode ? '60 seconds, exactly 6 scenes of 10 seconds' : '2-4 minutes', medium: '8-12 minutes', long: '15-20 minutes' };",
    'length label'
  );
  await write(rel, src);
}

async function patchSceneManifest() {
  const rel = 'utils/scene-repair-service.js';
  let src = await read(rel);
  src = replaceOnce(
    src,
    "  const totalDuration = durationSeconds(production.estimatedDuration || production.assets?.finalVideo?.duration, Math.max(30, blueprints.length * 8));",
    "  const shaktiShort = production.script?.metadata?.shaktiShort === true;\n  const totalDuration = shaktiShort ? 60 : durationSeconds(production.estimatedDuration || production.assets?.finalVideo?.duration, Math.max(30, blueprints.length * 8));",
    'scene total duration'
  );
  src = replaceOnce(
    src,
    "      duration: Math.max(2, Number(((wordCounts[position] / totalWords) * totalDuration).toFixed(2))),",
    "      duration: shaktiShort ? 10 : Math.max(2, Number(((wordCounts[position] / totalWords) * totalDuration).toFixed(2))),",
    'scene duration'
  );
  await write(rel, src);
}

async function patchProduction() {
  const rel = 'agents/production-management-agent.js';
  let src = await read(rel);

  src = replaceOnce(
    src,
    "  formatScriptForTTS(script) {\n    let ttsText = '';",
    `  formatScriptForTTS(script) {
    if (script?.metadata?.shaktiShort) {
      const body = (script.mainContent?.sections || []).map(section =>
        Array.isArray(section.content) ? section.content.filter(Boolean).join(' ') : String(section.content || '')
      );
      return [
        script.hook?.text,
        script.introduction?.topicIntro,
        ...body,
        ...(script.conclusion?.recap || []),
        script.callToAction?.subscribe
      ].map(value => String(value || '').trim()).filter(Boolean).join('\\n\\n');
    }

    let ttsText = '';`,
    'Shakti TTS formatting'
  );

  src = replaceOnce(
    src,
    "  createVisualPromptsFromScript(script) {\n    const prompts = [];",
    `  createVisualPromptsFromScript(script) {
    if (script?.metadata?.shaktiShort) {
      const body = (script.mainContent?.sections || []).map(section =>
        Array.isArray(section.content) ? section.content.filter(Boolean).join(' ') : String(section.content || '')
      );
      const beats = [
        script.hook?.text,
        script.introduction?.topicIntro,
        ...body,
        (script.conclusion?.recap || []).join(' '),
        script.callToAction?.subscribe
      ].map(value => String(value || '').trim()).filter(Boolean);
      if (beats.length !== 6) throw new Error('Shakti Short visual plan must contain exactly 6 beats');
      return beats.map((text, index) =>
        \`Shakti Millets scene \${index + 1} of 6. \${text}. Premium photorealistic Indian food advertising, realistic millet grains and natural textures, warm cinematic lighting, vertical composition, no invented package text, no medical imagery.\`
      );
    }

    const prompts = [];`,
    'Shakti visual prompts'
  );

  src = replaceOnce(
    src,
    "    // Hook\n    if (script.hook && script.hook.text) {",
    `    if (script?.metadata?.shaktiShort) {
      const body = (script.mainContent?.sections || []).map(section =>
        Array.isArray(section.content) ? section.content.filter(Boolean).join(' ') : String(section.content || '')
      );
      const beats = [
        script.hook?.text,
        script.introduction?.topicIntro,
        ...body,
        (script.conclusion?.recap || []).join(' '),
        script.callToAction?.subscribe
      ].map(value => String(value || '').trim()).filter(Boolean);
      beats.forEach((text, index) => processText(text, index * 10, 10));
      return srt;
    }

    // Hook
    if (script.hook && script.hook.text) {`,
    'Shakti captions'
  );

  src = src.replaceAll("resolution: '1920x1080'", "resolution: process.env.VIDEO_ASPECT_RATIO === '9:16' ? '1080x1920' : '1920x1080'");

  await write(rel, src);
}

async function patchVideoGenerator() {
  const rel = 'utils/ai-video-generator.js';
  let src = await read(rel);

  src = replaceOnce(
    src,
    '      size: "1536x1024",',
    "      size: process.env.VIDEO_ASPECT_RATIO === '9:16' ? '1024x1536' : '1536x1024',",
    'OpenAI image orientation'
  );

  src = replaceOnce(
    src,
    "          aspectRatio: '16:9',",
    "          aspectRatio: process.env.VIDEO_ASPECT_RATIO || '16:9',",
    'Gemini image orientation'
  );

  src = replaceOnce(
    src,
    "    return `${prompt}, ${enhancement}, high quality, 16:9 aspect ratio, digital art`;",
    "    return `${prompt}, ${enhancement}, high quality, ${process.env.VIDEO_ASPECT_RATIO || '16:9'} aspect ratio, digital art`;",
    'visual prompt orientation'
  );

  src = replaceOnce(
    src,
    "  async generateSlideshowVideo(script, visualAssets, audioPath, outputPath) {\n    this.logger.info('Creating slideshow video...');\n\n    if (!(await checkFFmpeg())) {\n      throw new Error(ffmpegInstallHint());\n    }",
    `  async generateSlideshowVideo(script, visualAssets, audioPath, outputPath) {
    this.logger.info('Creating slideshow video...');

    if (!(await checkFFmpeg())) {
      throw new Error(ffmpegInstallHint());
    }

    if (script?.metadata?.shaktiShort) {
      return this.generateShaktiShortSlideshow(script, visualAssets, audioPath, outputPath);
    }`,
    'Shakti slideshow entry'
  );

  src = replaceOnce(
    src,
    "  async renderSlidesToVideo(stills, totalDuration, videoPath) {",
    `  async generateShaktiShortSlideshow(_script, visualAssets, audioPath, outputPath) {
    const images = await this.filterLocalImageAssets(visualAssets);
    if (!images.length) throw new Error('Shakti Short requires at least one usable visual asset');

    const segments = Array.from({ length: 6 }, (_, index) => ({
      type: 'image',
      path: images[index % images.length],
      duration: 10
    }));
    const visualPath = outputPath.replace(/\\.mp4$/i, '_shakti_visual.mp4');
    await this.renderMediaTimeline(segments, visualPath);
    await this.addAudioToVideo(visualPath, audioPath, outputPath, { targetDuration: 60 });
    await fs.unlink(visualPath).catch(() => {});
    return outputPath;
  }

  async renderSlidesToVideo(stills, totalDuration, videoPath) {`,
    'insert Shakti slideshow'
  );

  src = replaceOnce(
    src,
    "  async renderMediaTimeline(segments, outputPath) {\n    const args = ['-y'];",
    "  async renderMediaTimeline(segments, outputPath) {\n    const { width, height } = this.videoDimensions();\n    const args = ['-y'];",
    'timeline dimensions setup'
  );

  src = replaceOnce(
    src,
    "      `[${index}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,fps=30,format=yuv420p,trim=duration=${Number(segment.duration).toFixed(2)},setpts=PTS-STARTPTS[v${index}]`",
    "      `[${index}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,fps=30,format=yuv420p,trim=duration=${Number(segment.duration).toFixed(2)},setpts=PTS-STARTPTS[v${index}]`",
    'timeline portrait scaling'
  );

  src = replaceOnce(
    src,
    "  async filterLocalImageAssets(visualAssets = []) {",
    `  videoDimensions() {
    return process.env.VIDEO_ASPECT_RATIO === '9:16'
      ? { width: 1080, height: 1920 }
      : { width: 1920, height: 1080 };
  }

  async filterLocalImageAssets(visualAssets = []) {`,
    'insert videoDimensions'
  );

  src = replaceOnce(
    src,
    "    const videoInput = options.loopVideo ? ['-stream_loop', '-1', '-i', videoPath] : ['-i', videoPath];\n    await runFFmpeg(['-y', ...videoInput, '-i', audioPath, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-shortest', muxPath]);",
    `    const videoInput = options.loopVideo ? ['-stream_loop', '-1', '-i', videoPath] : ['-i', videoPath];
    const targetDuration = Number(options.targetDuration || 0);
    if (targetDuration > 0) {
      await runFFmpeg([
        '-y', ...videoInput, '-i', audioPath,
        '-filter_complex', \`[1:a]apad=pad_dur=\${targetDuration}[aout]\`,
        '-map', '0:v:0', '-map', '[aout]',
        '-c:v', 'copy', '-c:a', 'aac', '-t', String(targetDuration), muxPath
      ]);
    } else {
      await runFFmpeg(['-y', ...videoInput, '-i', audioPath, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-shortest', muxPath]);
    }`,
    'exact 60-second mux'
  );

  src = replaceOnce(
    src,
    "  calculateScriptDuration(script) {\n    // Estimate duration based on word count (average 150 words per minute)",
    "  calculateScriptDuration(script) {\n    if (script?.metadata?.shaktiShort) return 60;\n    // Estimate duration based on word count (average 150 words per minute)",
    'Shakti script duration'
  );

  await write(rel, src);
}

async function main() {
  await fs.access(path.join(root, 'package.json'));
  await patchScriptWriter();
  await patchIndex();
  await patchSceneManifest();
  await patchProduction();
  await patchVideoGenerator();
  console.log('Applied Shakti Millets 60-second / 6x10s vertical Shorts patch.');
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
