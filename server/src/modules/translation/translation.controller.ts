import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { TranslationService, SUPPORTED_LANGUAGES } from './translation.service.js';

const translateSchema = z.object({
  commentId: z.string().optional(),
  text: z.string().optional(),
  targetLang: z.string().min(2).max(5),
});

export const getLanguages = (req: Request, res: Response) => {
  res.json({
    success: true,
    data: SUPPORTED_LANGUAGES,
  });
};

export const translate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = translateSchema.parse(req.body);

    if (data.commentId) {
      const result = await TranslationService.translateComment(data.commentId, data.targetLang);
      res.json({ success: true, data: result });
      return;
    }

    if (!data.text) {
      res.status(400).json({ success: false, error: 'Either commentId or text must be provided' });
      return;
    }

    const translatedText = await TranslationService.translateText(data.text, data.targetLang);
    res.json({
      success: true,
      data: {
        originalText: data.text,
        translatedText,
        targetLang: data.targetLang,
      },
    });
  } catch (error) {
    next(error);
  }
};
