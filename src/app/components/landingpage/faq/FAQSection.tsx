import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { landingPageContent } from '@/data/landing-page-content';

const FAQSection: React.FC = () => {
  const [expanded, setExpanded] = useState<string | false>(false);
  const faqData = landingPageContent.faq[0]; // Get the first FAQ section

  const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  return (
    <Box py={8} sx={{ backgroundColor: (theme) => theme.palette.grey[50] }}>
      <Container maxWidth="md">
        <Box textAlign="center" mb={6}>
          <Typography variant="h2" component="h2" gutterBottom fontWeight={700}>
            {faqData.title}
          </Typography>
          {faqData.subtitle && (
            <Typography variant="h5" color="text.secondary" maxWidth="600px" mx="auto">
              {faqData.subtitle}
            </Typography>
          )}
        </Box>

        <Box>
          {faqData.items.map((item) => (
            <Accordion
              key={item.id}
              expanded={expanded === item.id}
              onChange={handleChange(item.id)}
              sx={{
                mb: 2,
                '&:before': { display: 'none' },
                boxShadow: 1,
                borderRadius: 1,
                '&.Mui-expanded': {
                  margin: '0 0 16px 0'
                }
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  px: 3,
                  py: 2,
                  '& .MuiAccordionSummary-content': {
                    margin: '12px 0'
                  }
                }}
              >
                <Typography variant="h6" fontWeight={600}>
                  {item.question}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 3, pb: 3 }}>
                <Typography variant="body1" color="text.secondary" lineHeight={1.7}>
                  {item.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>

        {/* Contact CTA */}
        <Box textAlign="center" mt={6}>
          <Typography variant="h6" gutterBottom>
            Still have questions?
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={3}>
            Our team is here to help you get started with BOAMI
          </Typography>
          <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
            <Typography
              component="a"
              href="/contact"
              variant="body1"
              color="primary"
              sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              Contact Support
            </Typography>
            <Typography variant="body1" color="text.secondary">•</Typography>
            <Typography
              component="a"
              href="/demo"
              variant="body1"
              color="primary"
              sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              Schedule a Demo
            </Typography>
            <Typography variant="body1" color="text.secondary">•</Typography>
            <Typography
              component="a"
              href="/docs"
              variant="body1"
              color="primary"
              sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              View Documentation
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default FAQSection;