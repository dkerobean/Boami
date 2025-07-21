import React from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Rating from '@mui/material/Rating';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import TestimonialTitle from './TestimonialTitle';
import BlankCard from '../../shared/BlankCard';
import AnimationFadeIn from '../animation/Animation';
import { landingPageContent } from '@/data/landing-page-content';

//Carousel slider for product
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import './testimonial.css';

const Testimonial = () => {
  const { testimonials } = landingPageContent;

  const settings = {
    className: 'testimonial-slider',
    dots: true,
    arrows: false,
    infinite: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000,
    pauseOnHover: true,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 2,
        },
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: 1,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
  };

  return (
    <Box pt={14} pb={11} sx={{ backgroundColor: (theme) => theme.palette.grey[50] }}>
      <Container maxWidth="lg">
        <TestimonialTitle />
        <Box mt={5}>
          <AnimationFadeIn>
            <Slider {...settings}>
              {testimonials.map((testimonial) => (
                <Box p="15px" key={testimonial.id}>
                  <BlankCard sx={{ height: '100%' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography
                        fontSize="16px"
                        color="textPrimary"
                        mb={3}
                        sx={{ fontStyle: 'italic', lineHeight: 1.6 }}
                      >
                        "{testimonial.quote}"
                      </Typography>

                      <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                        <Avatar
                          src={testimonial.author.avatar}
                          alt={testimonial.author.name}
                          sx={{ width: 48, height: 48 }}
                        />
                        <Box>
                          <Typography variant="h6" fontWeight={600}>
                            {testimonial.author.name}
                          </Typography>
                          <Typography color="textSecondary" variant="body2">
                            {testimonial.author.title}, {testimonial.author.company}
                          </Typography>
                        </Box>
                        <Box ml="auto">
                          <Rating
                            size="small"
                            name="testimonial-rating"
                            value={5}
                            readOnly
                          />
                        </Box>
                      </Stack>

                      {testimonial.metrics && (
                        <Chip
                          label={testimonial.metrics.improvement}
                          color="primary"
                          variant="outlined"
                          size="small"
                          sx={{ mt: 1 }}
                        />
                      )}
                    </CardContent>
                  </BlankCard>
                </Box>
              ))}
            </Slider>
          </AnimationFadeIn>
        </Box>

        {/* Company Logos Section */}
        <Box mt={8} textAlign="center">
          <Typography variant="h6" color="textSecondary" mb={4}>
            Trusted by leading e-commerce businesses
          </Typography>
          <Stack
            direction="row"
            spacing={4}
            justifyContent="center"
            alignItems="center"
            flexWrap="wrap"
            sx={{ opacity: 0.7 }}
          >
            {/* Placeholder for company logos - replace with actual logos */}
            {['TechStyle Boutique', 'Urban Gear Co', 'Wellness Essentials', 'Fashion Forward', 'Digital Trends'].map((company) => (
              <Typography
                key={company}
                variant="h6"
                color="textSecondary"
                sx={{
                  fontWeight: 600,
                  px: 2,
                  py: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  minWidth: 120,
                  textAlign: 'center'
                }}
              >
                {company}
              </Typography>
            ))}
          </Stack>
        </Box>
      </Container>
    </Box>
  );
};

export default Testimonial;
