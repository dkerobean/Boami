import React from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { IconX, IconArrowRight, IconCheck } from '@tabler/icons-react';

const ProblemSolutionSection: React.FC = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const problems = [
    {
      title: "Scattered Tools & Data",
      description: "Managing inventory, orders, and customers across multiple disconnected systems creates chaos and inefficiency.",
      icon: IconX,
      color: '#f44336'
    },
    {
      title: "Manual Processes",
      description: "Time-consuming manual tasks like order processing and inventory updates slow down your business growth.",
      icon: IconX,
      color: '#ff9800'
    },
    {
      title: "Limited Insights",
      description: "Without proper analytics, you're making business decisions based on gut feeling rather than data.",
      icon: IconX,
      color: '#9c27b0'
    }
  ];

  const solutions = [
    "Unified dashboard for all operations",
    "Automated workflows and processes",
    "Real-time analytics and insights",
    "Seamless integrations",
    "AI-powered recommendations"
  ];

  return (
    <Box
      ref={ref}
      sx={{
        py: { xs: 8, md: 12 },
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background decorative elements */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          left: '-5%',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(244, 67, 54, 0.1) 0%, transparent 70%)',
          filter: 'blur(100px)',
          zIndex: 0,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '10%',
          right: '-5%',
          width: '250px',
          height: '250px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.1) 0%, transparent 70%)',
          filter: 'blur(80px)',
          zIndex: 0,
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <Box textAlign="center" mb={8}>
            <Typography
              variant="h2"
              component="h2"
              sx={{
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                fontWeight: 800,
                mb: 3,
                background: 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Stop Juggling Multiple Tools
            </Typography>
            <Typography
              variant="h5"
              sx={{
                color: 'text.secondary',
                maxWidth: '700px',
                mx: 'auto',
                fontSize: { xs: '1.1rem', md: '1.25rem' },
                lineHeight: 1.6
              }}
            >
              Most e-commerce businesses struggle with fragmented systems that create more problems than they solve
            </Typography>
          </Box>
        </motion.div>

        {/* Problems Grid */}
        <Grid container spacing={4} mb={8}>
          {problems.map((problem, index) => {
            const IconComponent = problem.icon;
            return (
              <Grid item xs={12} md={4} key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                >
                  <Card
                    sx={{
                      height: '100%',
                      textAlign: 'center',
                      p: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 3,
                      background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.12)',
                      }
                    }}
                  >
                    <CardContent sx={{ p: 0 }}>
                      <Box
                        sx={{
                          width: 60,
                          height: 60,
                          borderRadius: '50%',
                          backgroundColor: `${problem.color}15`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mx: 'auto',
                          mb: 3
                        }}
                      >
                        <IconComponent size={28} color={problem.color} />
                      </Box>
                      <Typography
                        variant="h6"
                        component="h3"
                        sx={{
                          fontWeight: 700,
                          mb: 2,
                          color: 'text.primary'
                        }}
                      >
                        {problem.title}
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          color: 'text.secondary',
                          lineHeight: 1.6
                        }}
                      >
                        {problem.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            );
          })}
        </Grid>

        {/* Arrow Transition */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <Box textAlign="center" mb={6}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                backgroundColor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                boxShadow: '0 8px 32px rgba(25, 118, 210, 0.3)',
              }}
            >
              <IconArrowRight size={32} color="white" />
            </Box>
          </Box>
        </motion.div>

        {/* Solution Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 1.0 }}
        >
          <Box textAlign="center" mb={6}>
            <Typography
              variant="h3"
              component="h3"
              sx={{
                fontSize: { xs: '1.8rem', sm: '2.2rem', md: '2.5rem' },
                fontWeight: 800,
                mb: 3,
                background: 'linear-gradient(135deg, #1976d2 0%, #4caf50 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              BOAMI Brings Everything Together
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: 'text.secondary',
                maxWidth: '800px',
                mx: 'auto',
                fontSize: { xs: '1rem', md: '1.1rem' },
                lineHeight: 1.6,
                mb: 4
              }}
            >
              One unified platform that handles your entire e-commerce operation from inventory to insights,
              so you can focus on growing your business instead of managing tools.
            </Typography>

            {/* Solution Benefits */}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              justifyContent="center"
              alignItems="center"
              flexWrap="wrap"
              sx={{ maxWidth: '800px', mx: 'auto' }}
            >
              {solutions.map((solution, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: 1.2 + index * 0.1 }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      px: 2,
                      py: 1,
                      borderRadius: 2,
                      backgroundColor: 'rgba(25, 118, 210, 0.1)',
                      border: '1px solid rgba(25, 118, 210, 0.2)',
                    }}
                  >
                    <IconCheck size={16} color="#1976d2" />
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        color: 'primary.main'
                      }}
                    >
                      {solution}
                    </Typography>
                  </Box>
                </motion.div>
              ))}
            </Stack>
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
};

export default ProblemSolutionSection;