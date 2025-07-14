import React, { useEffect, useRef } from "react";
import Box from '@mui/material/Box';
import { useParams } from "next/navigation";
import { Skeleton } from '@mui/material';

//Carousel slider for product
import Slider from "react-slick";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "./Carousel.css"

import { useProductDetail } from "@/hooks/useProductDetail";
import ProductImage from "@/app/components/shared/ProductImage";
import { getImageSource, createImageAltText, IMAGE_SIZES } from "@/lib/utils/image-utils";

const ProductCarousel = () => {
  const [state, setState] = React.useState<any>({ nav1: null, nav2: null });
  const slider1 = useRef();
  const slider2 = useRef();
  const params = useParams();
  
  // Get product ID from URL parameters
  const productId = params?.id as string;
  
  // Use the custom hook to fetch product data
  const { product, loading, error } = useProductDetail(productId);
  
  // Get all images for the carousel (main photo + gallery)
  const allImages = React.useMemo(() => {
    if (!product) return [];
    
    const images = [];
    
    // Add main product photo if available
    if (product.photo) {
      images.push(product.photo);
    }
    
    // Add gallery images if available
    if (product.gallery && product.gallery.length > 0) {
      images.push(...product.gallery);
    }
    
    // If no images, return empty array (will show placeholders)
    return images;
  }, [product]);
  useEffect(() => {
    setState({
      nav1: slider1.current,
      nav2: slider2.current,
    });
  }, []);

  const { nav1, nav2 } = state;
  const settings = {
    focusOnSelect: true,
    infinite: allImages.length > 1,
    slidesToShow: Math.min(allImages.length, 5),
    arrows: false,
    swipeToSlide: true,
    slidesToScroll: 1,
    centerMode: allImages.length > 3,
    className: "centerThumb",
    speed: 500,
  };

  // Loading state
  if (loading) {
    return (
      <Box>
        <Skeleton 
          variant="rounded" 
          width="100%" 
          height={500} 
          sx={{ borderRadius: '5px', mb: 2 }} 
        />
        <Box display="flex" gap={1} justifyContent="center">
          {[1, 2, 3, 4, 5].map((item) => (
            <Skeleton 
              key={item}
              variant="rounded" 
              width={72} 
              height={72} 
              sx={{ borderRadius: '5px' }} 
            />
          ))}
        </Box>
      </Box>
    );
  }

  // Error or no product
  if (error || !product) {
    return (
      <Box>
        <ProductImage
          src=""
          alt="Product image not available"
          width={500}
          height={500}
          variant="square"
          sx={{ borderRadius: '5px', width: '100%', height: 'auto' }}
        />
      </Box>
    );
  }

  // If no images, show placeholder
  if (allImages.length === 0) {
    return (
      <Box>
        <ProductImage
          src=""
          alt={createImageAltText(product.title)}
          title={product.title}
          width={500}
          height={500}
          variant="square"
          sx={{ borderRadius: '5px', width: '100%', height: 'auto' }}
        />
      </Box>
    );
  }

  // Single image - no carousel needed
  if (allImages.length === 1) {
    return (
      <Box>
        <ProductImage
          src={getImageSource(allImages[0], undefined, product.title)}
          alt={createImageAltText(product.title)}
          title={product.title}
          width={500}
          height={500}
          variant="square"
          priority={true}
          sx={{ borderRadius: '5px', width: '100%', height: 'auto' }}
        />
      </Box>
    );
  }

  // Multiple images - show carousel
  return (
    <Box>
      <Slider asNavFor={nav2} ref={(slider: any) => (slider1.current = slider)}>
        {allImages.map((imageUrl, index) => (
          <Box key={index}>
            <ProductImage
              src={getImageSource(imageUrl, undefined, product.title)}
              alt={createImageAltText(product.title, index)}
              title={product.title}
              width={500}
              height={500}
              variant="square"
              priority={index === 0}
              sx={{ borderRadius: '5px', width: '100%', height: 'auto' }}
            />
          </Box>
        ))}
      </Slider>
      <Slider
        asNavFor={nav1}
        ref={(slider: any) => (slider2.current = slider)}
        {...settings}
      >
        {allImages.map((imageUrl, index) => (
          <Box key={index} sx={{ p: 1, cursor: "pointer" }}>
            <ProductImage
              src={getImageSource(imageUrl, undefined, product.title)}
              alt={createImageAltText(product.title, index)}
              title={product.title}
              width={72}
              height={72}
              variant="square"
              sx={{ borderRadius: '5px' }}
            />
          </Box>
        ))}
      </Slider>
    </Box>
  );
};

export default ProductCarousel;
