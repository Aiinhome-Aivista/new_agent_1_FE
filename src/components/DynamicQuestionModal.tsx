import React, { useState, useEffect } from 'react';
import { User, Bot } from 'lucide-react';
import { Modal } from './ui/Modal/Modal';
import { Button } from './ui/Button/Button';
import { Input } from './ui/Input/Input';
import { proposalApi } from '../services/api/endpoints';

interface DynamicQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userAnswers: string) => void;
  contextData: any;
}

export const DynamicQuestionModal: React.FC<DynamicQuestionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  contextData
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [qaHistory, setQaHistory] = useState<{ question: string; answer: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const chatContainerRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [qaHistory, currentQuestion, isLoading]);

  const MAX_QUESTIONS = 5;

  const fetchNextQuestion = async (history: { question: string; answer: string }[]) => {
    setIsLoading(true);
    try {
      const response = await proposalApi.generateQuestion({
        context: {
          clientName: contextData?.clientName,
          projectDuration: contextData?.projectDuration,
          budget: contextData?.budget,
          requirementsText: contextData?.requirementsText,
        },
        history: history,
        questionIndex: history.length + 1
      });
      setCurrentQuestion(response.data.question || 'Please provide more details about your requirements.');
    } catch (error) {
      console.error('Failed to fetch next question:', error);
      setCurrentQuestion('Could you provide any additional context or requirements?');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setCurrentQuestionIndex(0);
      setCurrentQuestion('');
      setCurrentAnswer('');
      setQaHistory([]);
      
      // Fetch first question
      fetchNextQuestion([]);
    }
  }, [isOpen]);

  const handleNext = (isSkip = false) => {
    if (!isSkip && !currentAnswer.trim()) return;

    const answerToSave = isSkip ? "(Skipped)" : currentAnswer;
    const newHistory = [...qaHistory, { question: currentQuestion, answer: answerToSave }];
    
    if (currentQuestionIndex < MAX_QUESTIONS - 1) {
      setQaHistory(newHistory);
      setCurrentAnswer('');
      setCurrentQuestionIndex(prev => prev + 1);
      fetchNextQuestion(newHistory);
    } else {
      // Final submission
      setQaHistory(newHistory);
      const formattedAnswers = newHistory.map((qa, index) => `Q${index + 1}: ${qa.question}\nA: ${qa.answer}`).join('\n\n');
      onSubmit(formattedAnswers);
    }
  };

  const isInitialLoading = isLoading && qaHistory.length === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isInitialLoading ? undefined : `Additional Details (Question ${currentQuestionIndex + 1} of ${MAX_QUESTIONS})`}
      hideCloseButton={isInitialLoading}
      className='h-[75vh]'
    >
      {isInitialLoading ? (
        <div className="flex justify-center items-center py-12 h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : (
        <div className="flex flex-col h-full overflow-hidden">
          {/* Chat History Section */}
          <div 
            ref={chatContainerRef}
            className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2 scroll-smooth pb-4" 
          >
            {qaHistory.map((qa, index) => (
              <div key={index} className="flex flex-col gap-2">
                <div className="flex items-end justify-start gap-2 max-w-[91%] self-start">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0 mb-1">
                    <Bot size={16} className="text-gray-500 dark:text-gray-400" />
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg rounded-tl-none text-sm text-gray-800 dark:text-gray-200">
                    <span className="break-words">{qa.question}</span>
                  </div>
                </div>
                <div className="flex items-end justify-end gap-2 max-w-[91%] self-end">
                  <div className="bg-orange-500 text-white p-3 rounded-lg rounded-tr-none text-sm">
                    <span className="break-words">{qa.answer}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0 mb-1">
                    <User size={16} className="text-orange-500" />
                  </div>
                </div>
              </div>
            ))}

            {/* Current Question Loading or Text */}
            {isLoading ? (
              <div className="flex items-end justify-start gap-2 max-w-[91%] self-start">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0 mb-1">
                  <Bot size={16} className="text-gray-500 dark:text-gray-400" />
                </div>
                <div className="py-4 text-left text-sm text-gray-500 bg-gray-100 dark:bg-gray-800 p-3 rounded-lg rounded-tl-none flex items-center space-x-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            ) : (
              currentQuestion && (
                <div className="flex items-end justify-start gap-2 max-w-[91%] self-start">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0 mb-1">
                    <Bot size={16} className="text-gray-500 dark:text-gray-400" />
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg rounded-tl-none text-sm text-gray-800 dark:text-gray-200">
                    <span className="break-words">{currentQuestion}</span>
                  </div>
                </div>
              )
            )}
          </div>
          {/* Input Section */}
          <div className="mt-2">
            <Input
              className="border-border focus:border-primary text-gray-900 dark:text-gray-100 placeholder:text-gray-500"
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder="Type your answer here..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading && currentAnswer.trim()) {
                  e.preventDefault();
                  handleNext();
                }
              }}
              autoFocus
              disabled={isLoading}
            />
          </div>
          
          <div className="flex justify-end gap-3 mt-2 border-t border-gray-200 dark:border-gray-800 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="outline" onClick={() => handleNext(true)} disabled={isLoading}>
              Skip
            </Button>
            <Button variant="primary" onClick={() => handleNext(false)} disabled={isLoading || !currentAnswer.trim()}>
              {currentQuestionIndex === MAX_QUESTIONS - 1 ? 'Submit & Assemble' : 'Next'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
