-- CreateTable
CREATE TABLE "Projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "globalPrompt" TEXT NOT NULL DEFAULT '',
    "questionPrompt" TEXT NOT NULL DEFAULT '',
    "answerPrompt" TEXT NOT NULL DEFAULT '',
    "labelPrompt" TEXT NOT NULL DEFAULT '',
    "domainTreePrompt" TEXT NOT NULL DEFAULT '',
    "cleanPrompt" TEXT NOT NULL DEFAULT '',
    "defaultModelConfigId" TEXT,
    "test" TEXT NOT NULL DEFAULT '',
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadFiles" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileExt" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "md5" TEXT NOT NULL,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadFiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chunks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tags" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "Tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Questions" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "chunkId" TEXT NOT NULL,
    "gaPairId" TEXT,
    "question" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "answered" BOOLEAN NOT NULL DEFAULT false,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Datasets" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "chunkName" TEXT NOT NULL,
    "chunkContent" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "questionLabel" TEXT NOT NULL,
    "cot" TEXT NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tags" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "other" TEXT NOT NULL DEFAULT '',
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Datasets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LlmProviders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiUrl" TEXT NOT NULL,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LlmProviders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LlmModels" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LlmModels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelConfig" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "maxTokens" INTEGER NOT NULL,
    "topP" DOUBLE PRECISION NOT NULL,
    "topK" DOUBLE PRECISION NOT NULL,
    "status" INTEGER NOT NULL,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "modelInfo" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'zh-CN',
    "detail" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GaPairs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "pairNumber" INTEGER NOT NULL,
    "genreTitle" TEXT NOT NULL,
    "genreDesc" TEXT NOT NULL,
    "audienceTitle" TEXT NOT NULL,
    "audienceDesc" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GaPairs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Chunks_projectId_idx" ON "Chunks"("projectId");

-- CreateIndex
CREATE INDEX "Questions_projectId_idx" ON "Questions"("projectId");

-- CreateIndex
CREATE INDEX "Datasets_projectId_idx" ON "Datasets"("projectId");

-- CreateIndex
CREATE INDEX "Task_projectId_idx" ON "Task"("projectId");

-- CreateIndex
CREATE INDEX "GaPairs_projectId_idx" ON "GaPairs"("projectId");

-- CreateIndex
CREATE INDEX "GaPairs_fileId_idx" ON "GaPairs"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "GaPairs_fileId_pairNumber_key" ON "GaPairs"("fileId", "pairNumber");

-- AddForeignKey
ALTER TABLE "UploadFiles" ADD CONSTRAINT "UploadFiles_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chunks" ADD CONSTRAINT "Chunks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tags" ADD CONSTRAINT "Tags_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tags" ADD CONSTRAINT "Tags_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Tags"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Questions" ADD CONSTRAINT "Questions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Questions" ADD CONSTRAINT "Questions_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "Chunks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Questions" ADD CONSTRAINT "Questions_gaPairId_fkey" FOREIGN KEY ("gaPairId") REFERENCES "GaPairs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Datasets" ADD CONSTRAINT "Datasets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LlmModels" ADD CONSTRAINT "LlmModels_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "LlmProviders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelConfig" ADD CONSTRAINT "ModelConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GaPairs" ADD CONSTRAINT "GaPairs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GaPairs" ADD CONSTRAINT "GaPairs_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "UploadFiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
